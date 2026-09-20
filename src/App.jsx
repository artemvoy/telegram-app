import { useEffect, useState } from "react";
import "./index.css";
import { supabase } from "./supabaseClient";

function App() {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);

  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("");

  const [isLogin, setIsLogin] = useState(false);

  const [text, setText] = useState("");
  const [postImage, setPostImage] = useState("");

  const [page, setPage] = useState("home");
  const [profileUserId, setProfileUserId] = useState(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [search, setSearch] = useState("");

  const currentUser = users.find((user) => user.id === currentUserId);

  // ============================================
  // START APP
  // ============================================

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUserId(session.user.id);

        // Не робимо await запитів до БД прямо в колбеку —
        // Supabase радить виносити їх за межі колбека.
        setTimeout(async () => {
          await loadAll();
          setLoading(false);
        }, 0);
      } else {
        setCurrentUserId(null);
        setUsers([]);
        setPosts([]);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ============================================
  // CHECK AUTH
  // ============================================

  async function checkUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setCurrentUserId(session.user.id);
      await loadAll();
    }

    setLoading(false);
  }

  async function loadAll() {
    await Promise.all([loadUsers(), loadPosts()]);
  }

  // ============================================
  // LOAD USERS
  // ============================================

  async function loadUsers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Users error:", error);
      return;
    }

    const { data: follows } = await supabase.from("follows").select("*");

    const formattedUsers = (data || []).map((user) => ({
      ...user,

      followers: (follows || [])
        .filter((follow) => follow.following_id === user.id)
        .map((follow) => follow.follower_id),

      following: (follows || [])
        .filter((follow) => follow.follower_id === user.id)
        .map((follow) => follow.following_id),
    }));

    setUsers(formattedUsers);
  }

  // ============================================
  // LOAD POSTS
  // ============================================

  async function loadPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        profiles (
          id,
          name,
          username,
          avatar
        ),
        comments (
          id,
          post_id,
          user_id,
          text,
          created_at,
          profiles (
            id,
            name,
            username,
            avatar
          )
        ),
        likes (
          user_id
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Posts error:", error);
      return;
    }

    const formattedPosts = (data || []).map((post) => ({
      id: post.id,

      userId: post.user_id,

      text: post.text || "",

      image: post.image || "",

      date: formatDate(post.created_at),

      likes: (post.likes || []).map((like) => like.user_id),

      comments: (post.comments || []).map((comment) => ({
        id: comment.id,
        userId: comment.user_id,
        text: comment.text,
        date: formatDate(comment.created_at),
      })),

      author: post.profiles,
    }));

    setPosts(formattedPosts);
  }

  // ============================================
  // DATE
  // ============================================

  function formatDate(date) {
    if (!date) return "";

    const now = new Date();
    const created = new Date(date);

    const difference = now.getTime() - created.getTime();

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) {
      return "Зараз";
    }

    if (minutes < 60) {
      return `${minutes} хв`;
    }

    if (hours < 24) {
      return `${hours} год`;
    }

    if (days < 7) {
      return `${days} дн`;
    }

    return created.toLocaleDateString("uk-UA");
  }

  // ============================================
  // REGISTER
  // ============================================

  async function register() {
    if (!name.trim()) {
      alert("Введи ім'я");
      return;
    }

    if (!username.trim()) {
      alert("Введи username");
      return;
    }

    if (!email.trim()) {
      alert("Введи email");
      return;
    }

    if (password.length < 6) {
      alert("Пароль повинен містити мінімум 6 символів");
      return;
    }

    const cleanUsername = username.replace("@", "").trim().toLowerCase();

    if (!cleanUsername) {
      alert("Введи username");
      return;
    }

    setLoading(true);

    // Профіль створює тригер у базі (handle_new_user),
    // тому name і username передаємо через options.data.
    // Аватарку сюди НЕ передаємо — base64 роздує токен.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          username: cleanUsername,
        },
      },
    });

    if (error) {
      console.error(error);

      // Якщо username вже зайнятий (unique у БД), тригер кидає помилку,
      // і Supabase повертає загальне повідомлення.
      if (error.message.toLowerCase().includes("database error")) {
        alert("Не вдалося створити акаунт. Можливо, такий username вже існує");
      } else {
        alert(error.message);
      }

      setLoading(false);
      return;
    }

    if (!data.user) {
      alert("Не вдалося створити акаунт");
      setLoading(false);
      return;
    }

    // Якщо в Supabase увімкнене підтвердження email, сесії ще немає
    if (!data.session) {
      alert("Перевір пошту, підтверди email і потім увійди");

      setIsLogin(true);
      setName("");
      setUsername("");
      setPassword("");
      setAvatar("");
      setLoading(false);
      return;
    }

    // Сесія є — можна зберегти аватарку (RLS пропустить, бо auth.uid() = id)
    if (avatar) {
      const { error: avatarError } = await supabase
        .from("profiles")
        .update({ avatar })
        .eq("id", data.user.id);

      if (avatarError) {
        console.error(avatarError);
        alert("Акаунт створено, але аватарка не збереглась: " + avatarError.message);
      }
    }

    setCurrentUserId(data.user.id);

    await loadAll();

    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setAvatar("");

    setLoading(false);
  }

  // ============================================
  // LOGIN
  // ============================================

  async function login() {
    if (!email.trim()) {
      alert("Введи email");
      return;
    }

    if (!password) {
      alert("Введи пароль");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      alert("Неправильний email або пароль");

      setLoading(false);
      return;
    }

    setCurrentUserId(data.user.id);

    await loadAll();

    setEmail("");
    setPassword("");

    setLoading(false);
  }

  // ============================================
  // LOGOUT
  // ============================================

  async function logout() {
    await supabase.auth.signOut();

    setCurrentUserId(null);
    setUsers([]);
    setPosts([]);

    setPage("home");
    setProfileUserId(null);

    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setAvatar("");
  }

  // ============================================
  // SELECT AVATAR
  // ============================================

  function selectAvatar(e) {
    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Фото повинно бути менше 5 MB");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setAvatar(reader.result);
    };

    reader.readAsDataURL(file);
  }

  // ============================================
  // SELECT POST IMAGE
  // ============================================

  function selectPostImage(e) {
    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Фото повинно бути менше 8 MB");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPostImage(reader.result);
    };

    reader.readAsDataURL(file);
  }

  // ============================================
  // ADD POST
  // ============================================

  async function addPost() {
    if (!text.trim() && !postImage) {
      return;
    }

    if (!currentUserId) {
      alert("Спочатку увійди");
      return;
    }

    const { error } = await supabase.from("posts").insert({
      user_id: currentUserId,
      text: text.trim(),
      image: postImage || null,
    });

    if (error) {
      console.error(error);
      alert("Помилка створення поста: " + error.message);
      return;
    }

    setText("");
    setPostImage("");

    await loadPosts();
  }

  // ============================================
  // LIKE
  // ============================================

  async function likePost(postId) {
    if (!currentUserId) return;

    const post = posts.find((item) => item.id === postId);

    if (!post) return;

    const liked = post.likes.includes(currentUserId);

    if (liked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUserId);

      if (error) {
        console.error(error);
        return;
      }
    } else {
      const { error } = await supabase.from("likes").insert({
        post_id: postId,
        user_id: currentUserId,
      });

      if (error) {
        console.error(error);
        return;
      }
    }

    await loadPosts();
  }

  // ============================================
  // COMMENT
  // ============================================

  async function addComment(postId, commentText) {
    if (!commentText.trim()) return;

    if (!currentUserId) return;

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUserId,
      text: commentText.trim(),
    });

    if (error) {
      console.error(error);

      alert("Помилка коментаря: " + error.message);

      return;
    }

    await loadPosts();
  }

  // ============================================
  // FOLLOW / UNFOLLOW
  // ============================================

  async function toggleFollow(userId) {
    if (userId === currentUserId || !currentUserId) {
      return;
    }

    const current = users.find((user) => user.id === currentUserId);

    const following = current?.following?.includes(userId);

    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", userId);

      if (error) {
        console.error(error);
        return;
      }
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: userId,
      });

      if (error) {
        console.error(error);
        return;
      }
    }

    await loadUsers();
  }

  // ============================================
  // DELETE POST
  // ============================================

  async function deletePost(postId) {
    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error(error);

      alert("Не вдалося видалити пост");

      return;
    }

    await loadPosts();
  }

  // ============================================
  // UPDATE PROFILE
  // ============================================

  async function updateProfile() {
    if (!name.trim()) {
      alert("Введи ім'я");
      return;
    }

    if (!username.trim()) {
      alert("Введи username");
      return;
    }

    const cleanUsername = username.replace("@", "").trim().toLowerCase();

    const exists = users.some(
      (user) =>
        user.id !== currentUserId &&
        user.username.toLowerCase() === cleanUsername
    );

    if (exists) {
      alert("Такий username вже використовується");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        username: cleanUsername,
        avatar: avatar || null,
      })
      .eq("id", currentUserId);

    if (error) {
      console.error(error);

      // 23505 = порушення unique-обмеження
      if (error.code === "23505") {
        alert("Такий username вже використовується");
      } else {
        alert("Помилка: " + error.message);
      }

      return;
    }

    await loadUsers();

    setEditingProfile(false);
  }

  // ============================================
  // USER
  // ============================================

  function getUser(userId) {
    return users.find((user) => user.id === userId);
  }

  // ============================================
  // PROFILE
  // ============================================

  function openProfile(userId) {
    setProfileUserId(userId);
    setPage("profile");
  }

  function startEditing() {
    if (!currentUser) return;

    setName(currentUser.name);
    setUsername(currentUser.username);
    setAvatar(currentUser.avatar || "");

    setEditingProfile(true);
  }

  // ============================================
  // LOADING
  // ============================================

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="x-logo">𝕏</div>

          <h1>Mini Social</h1>

          <p>Завантаження...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // LOGIN / REGISTER PAGE
  // ============================================

  if (!currentUser) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="x-logo">𝕏</div>

          <h1>Mini Social</h1>

          <p>Соціальна мережа нового покоління</p>

          {!isLogin && (
            <>
              <input
                placeholder="Ім'я"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                placeholder="@username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                isLogin ? login() : register();
              }
            }}
          />

          {!isLogin && (
            <>
              <label className="upload-button">
                🖼️ Додати фото
                <input
                  type="file"
                  accept="image/*"
                  onChange={selectAvatar}
                />
              </label>

              {avatar && (
                <img className="login-avatar" src={avatar} alt="" />
              )}
            </>
          )}

          <button
            className="primary-button"
            onClick={isLogin ? login : register}
          >
            {isLogin ? "Увійти" : "Створити акаунт"}
          </button>

          <button
            className="auth-switch"
            onClick={() => {
              setIsLogin(!isLogin);

              setName("");
              setUsername("");
              setEmail("");
              setPassword("");
              setAvatar("");
            }}
          >
            {isLogin
              ? "Немає акаунта? Зареєструватися"
              : "Вже є акаунт? Увійти"}
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN APP
  // ============================================

  return (
    <div className="twitter-app">
      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="sidebar-logo">𝕏</div>

        <button
          className={page === "home" ? "side-link active" : "side-link"}
          onClick={() => setPage("home")}
        >
          <span>⌂</span>
          <b>Головна</b>
        </button>

        <button
          className={page === "people" ? "side-link active" : "side-link"}
          onClick={() => setPage("people")}
        >
          <span>♙</span>
          <b>Користувачі</b>
        </button>

        <button
          className={page === "profile" ? "side-link active" : "side-link"}
          onClick={() => openProfile(currentUserId)}
        >
          <span>◉</span>
          <b>Профіль</b>
        </button>

        <button
          className="post-big-button"
          onClick={() => document.getElementById("post-input")?.focus()}
        >
          Постити
        </button>

        <div className="sidebar-bottom">
          <button
            className="account-mini"
            onClick={() => openProfile(currentUserId)}
          >
            <div className="small-avatar">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="" />
              ) : (
                currentUser.name.charAt(0).toUpperCase()
              )}
            </div>

            <div>
              <strong>{currentUser.name}</strong>

              <span>@{currentUser.username}</span>
            </div>
          </button>

          <button className="logout-button" onClick={logout}>
            Вийти
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <main className="main-column">
        {/* HOME */}

        {page === "home" && (
          <>
            <header className="page-header">
              <h2>Головна</h2>
            </header>

            <section className="composer">
              <div className="composer-avatar">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="" />
                ) : (
                  currentUser.name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="composer-content">
                <textarea
                  id="post-input"
                  placeholder="Що нового?"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                {postImage && (
                  <div className="image-container">
                    <img src={postImage} alt="" />

                    <button onClick={() => setPostImage("")}>×</button>
                  </div>
                )}

                <div className="composer-bottom">
                  <label className="photo-label">
                    🖼️
                    <input
                      type="file"
                      accept="image/*"
                      onChange={selectPostImage}
                    />
                  </label>

                  <button className="post-button" onClick={addPost}>
                    Постити
                  </button>
                </div>
              </div>
            </section>

            {/* ALL POSTS */}

            {posts.map((post) => {
              const author = getUser(post.userId);

              if (!author) {
                return null;
              }

              return (
                <Post
                  key={post.id}
                  post={post}
                  author={author}
                  currentUser={currentUser}
                  users={users}
                  onLike={likePost}
                  onComment={addComment}
                  onProfile={openProfile}
                  onDelete={deletePost}
                />
              );
            })}

            {posts.length === 0 && (
              <div className="empty-state">
                <h2>Поки немає постів</h2>

                <p>Створи перший пост 🚀</p>
              </div>
            )}
          </>
        )}

        {/* PEOPLE */}

        {page === "people" && (
          <People
            users={users}
            currentUser={currentUser}
            search={search}
            setSearch={setSearch}
            onFollow={toggleFollow}
            onProfile={openProfile}
          />
        )}

        {/* PROFILE */}

        {page === "profile" && (
          <Profile
            user={getUser(profileUserId) || currentUser}
            currentUser={currentUser}
            posts={posts}
            onEdit={startEditing}
            onFollow={toggleFollow}
            onBack={() => setPage("home")}
          />
        )}
      </main>

      {/* RIGHT SIDEBAR */}

      <aside className="right-sidebar">
        <div className="search-box">
          🔍
          <input
            placeholder="Пошук"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="right-card">
          <h2>Кого читати</h2>

          {users
            .filter((user) => user.id !== currentUserId)
            .slice(0, 3)
            .map((user) => (
              <div className="suggested-user" key={user.id}>
                <div
                  className="small-avatar"
                  onClick={() => openProfile(user.id)}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div
                  className="suggested-info"
                  onClick={() => openProfile(user.id)}
                >
                  <strong>{user.name}</strong>

                  <span>@{user.username}</span>
                </div>

                <button onClick={() => toggleFollow(user.id)}>
                  {currentUser.following.includes(user.id)
                    ? "Читаєш"
                    : "Читати"}
                </button>
              </div>
            ))}

          {users.filter((user) => user.id !== currentUserId).length === 0 && (
            <p className="empty-small">Поки немає інших користувачів</p>
          )}
        </div>
      </aside>

      {/* EDIT PROFILE */}

      {editingProfile && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Редагувати профіль</h2>

              <button onClick={() => setEditingProfile(false)}>×</button>
            </div>

            <input
              placeholder="Ім'я"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label className="upload-button">
              🖼️ Змінити аватарку
              <input type="file" accept="image/*" onChange={selectAvatar} />
            </label>

            {avatar && <img className="edit-avatar" src={avatar} alt="" />}

            <button className="primary-button" onClick={updateProfile}>
              Зберегти
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ======================================================
// POST
// ======================================================

function Post({
  post,
  author,
  currentUser,
  users,
  onLike,
  onComment,
  onProfile,
  onDelete,
}) {
  const [comment, setComment] = useState("");

  const [showComments, setShowComments] = useState(false);

  const liked = post.likes.includes(currentUser.id);

  function sendComment() {
    if (!comment.trim()) {
      return;
    }

    onComment(post.id, comment);

    setComment("");
  }

  return (
    <article className="tweet">
      <div className="tweet-avatar" onClick={() => onProfile(author.id)}>
        {author.avatar ? (
          <img src={author.avatar} alt="" />
        ) : (
          author.name.charAt(0).toUpperCase()
        )}
      </div>

      <div className="tweet-body">
        <div className="tweet-header">
          <strong onClick={() => onProfile(author.id)}>{author.name}</strong>

          <span>@{author.username}</span>

          <span>·</span>

          <span>{post.date}</span>

          {post.userId === currentUser.id && (
            <button className="tweet-more" onClick={() => onDelete(post.id)}>
              ···
            </button>
          )}
        </div>

        {post.text && <p className="tweet-text">{post.text}</p>}

        {post.image && (
          <img className="tweet-image" src={post.image} alt="" />
        )}

        <div className="tweet-actions">
          <button onClick={() => setShowComments(!showComments)}>
            💬
            <span>{post.comments.length}</span>
          </button>

          <button
            className={liked ? "liked" : ""}
            onClick={() => onLike(post.id)}
          >
            {liked ? "❤️" : "♡"}

            <span>{post.likes.length}</span>
          </button>

          <button>↗</button>
        </div>

        {showComments && (
          <div className="comments">
            {post.comments.map((item) => {
              const user = users.find((u) => u.id === item.userId);

              return (
                <div className="comment" key={item.id}>
                  <strong>{user?.name || "Користувач"}</strong>

                  <span>{item.text}</span>
                </div>
              );
            })}

            <div className="comment-input">
              <input
                placeholder="Написати відповідь..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendComment();
                  }
                }}
              />

              <button onClick={sendComment}>➤</button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ======================================================
// PEOPLE
// ======================================================

function People({
  users,
  currentUser,
  search,
  setSearch,
  onFollow,
  onProfile,
}) {
  const filtered = users.filter((user) => {
    const value = search.toLowerCase();

    return (
      user.name.toLowerCase().includes(value) ||
      user.username.toLowerCase().includes(value)
    );
  });

  return (
    <>
      <header className="page-header">
        <h2>Користувачі</h2>
      </header>

      <div className="people-search">
        🔍
        <input
          placeholder="Знайти користувача"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.map((user) => {
        const following = currentUser.following.includes(user.id);

        return (
          <div className="person-row" key={user.id}>
            <div className="tweet-avatar" onClick={() => onProfile(user.id)}>
              {user.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="person-info" onClick={() => onProfile(user.id)}>
              <strong>{user.name}</strong>

              <span>@{user.username}</span>
            </div>

            {user.id !== currentUser.id && (
              <button
                className={following ? "following" : ""}
                onClick={() => onFollow(user.id)}
              >
                {following ? "Читаєш" : "Читати"}
              </button>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="empty-state">
          <h2>Нікого не знайдено</h2>
        </div>
      )}
    </>
  );
}

// ======================================================
// PROFILE
// ======================================================

function Profile({ user, currentUser, posts, onEdit, onFollow, onBack }) {
  if (!user) {
    return null;
  }

  const own = user.id === currentUser.id;

  const following = currentUser.following.includes(user.id);

  const userPosts = posts.filter((post) => post.userId === user.id);

  return (
    <>
      <header className="profile-top">
        <button onClick={onBack}>←</button>

        <div>
          <strong>{user.name}</strong>

          <span>{userPosts.length} постів</span>
        </div>
      </header>

      <section className="profile-cover"></section>

      <section className="profile-info">
        <div className="profile-avatar-large">
          {user.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="profile-buttons">
          {own ? (
            <button onClick={onEdit}>Редагувати профіль</button>
          ) : (
            <button
              className={following ? "following" : ""}
              onClick={() => onFollow(user.id)}
            >
              {following ? "Відписатися" : "Підписатися"}
            </button>
          )}
        </div>

        <h1>{user.name}</h1>

        <p className="profile-username">@{user.username}</p>

        <div className="profile-stats">
          <span>
            <b>{user.following.length}</b> Підписки
          </span>

          <span>
            <b>{user.followers.length}</b> Читачі
          </span>
        </div>
      </section>

      <div className="profile-tabs">Пости</div>

      {userPosts.map((post) => (
        <div className="profile-tweet" key={post.id}>
          <div className="tweet-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt="" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>

          <div>
            <div className="tweet-header">
              <strong>{user.name}</strong>

              <span>@{user.username}</span>
            </div>

            {post.text && <p>{post.text}</p>}

            {post.image && (
              <img className="tweet-image" src={post.image} alt="" />
            )}
          </div>
        </div>
      ))}
    </>
  );
}

export default App;