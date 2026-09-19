import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import "./index.css";

function getStorage(key) {
  try {
    const data = localStorage.getItem(key);

    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    console.error(`Помилка localStorage (${key}):`, error);
    localStorage.removeItem(key);
    return null;
  }
}

function App() {
  const [user, setUser] = useState(() => {
    return getStorage("twitter_user");
  });

  const [posts, setPosts] = useState(() => {
    return getStorage("twitter_posts") || [];
  });

  const [page, setPage] = useState("home");

  const [registerName, setRegisterName] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");

  const [postText, setPostText] = useState("");
  const [postImage, setPostImage] = useState(null);

  // Telegram Mini App
  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();

      WebApp.setHeaderColor("#081321");
      WebApp.setBackgroundColor("#050b14");
    } catch (error) {
      console.log("Telegram SDK працює тільки всередині Telegram");
    }
  }, []);

  // Зберігаємо користувача
  useEffect(() => {
    if (user) {
      localStorage.setItem("twitter_user", JSON.stringify(user));
    }
  }, [user]);

  // Зберігаємо пости
  useEffect(() => {
    localStorage.setItem("twitter_posts", JSON.stringify(posts));
  }, [posts]);

  // Реєстрація
  function register() {
    const name = registerName.trim();
    const username = registerUsername
      .trim()
      .replace("@", "");

    if (!name || !username) {
      alert("Заповни всі поля");
      return;
    }

    if (username.length < 3) {
      alert("Username повинен містити мінімум 3 символи");
      return;
    }

    const newUser = {
      id: Date.now(),
      name: name,
      username: username,
      avatar: `https://i.pravatar.cc/150?img=${
        Math.floor(Math.random() * 50) + 1
      }`,
    };

    setUser(newUser);
  }

  // Вибір фото
  function handleImage(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Можна завантажувати тільки фото");
      return;
    }

    // Обмеження 5 MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Фото повинно бути менше 5 MB");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPostImage(reader.result);
    };

    reader.readAsDataURL(file);
  }

  // Створення поста
  function createPost() {
    if (!postText.trim() && !postImage) {
      alert("Напиши щось або додай фото");
      return;
    }

    const newPost = {
      id: Date.now(),

      text: postText.trim(),

      image: postImage,

      author: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
      },

      likes: 0,

      liked: false,

      comments: 0,

      date: new Date().toLocaleString("uk-UA", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setPosts((currentPosts) => [
      newPost,
      ...currentPosts,
    ]);

    setPostText("");
    setPostImage(null);
  }

  // Лайк
  function likePost(id) {
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== id) {
          return post;
        }

        return {
          ...post,

          liked: !post.liked,

          likes: post.liked
            ? post.likes - 1
            : post.likes + 1,
        };
      })
    );
  }

  // Видалення поста
  function deletePost(id) {
    const confirmed = window.confirm(
      "Видалити цей пост?"
    );

    if (!confirmed) {
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== id)
    );
  }

  // Вихід
  function logout() {
    localStorage.removeItem("twitter_user");
    setUser(null);

    setRegisterName("");
    setRegisterUsername("");
  }

  // Кількість моїх постів
  const myPosts = posts.filter(
    (post) => post.author.id === user?.id
  );

  // ==============================
  // REGISTRATION
  // ==============================

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">

          <div className="big-logo">
            𝕏
          </div>

          <h1>
            Ласкаво просимо
          </h1>

          <p className="auth-subtitle">
            Створи профіль та ділись своїми
            думками, фотографіями та новинами.
          </p>

          <label>
            Ім'я
          </label>

          <input
            type="text"
            placeholder="Наприклад, Артем"
            value={registerName}
            onChange={(event) =>
              setRegisterName(event.target.value)
            }
          />

          <label>
            Username
          </label>

          <input
            type="text"
            placeholder="@artem"
            value={registerUsername}
            onChange={(event) =>
              setRegisterUsername(event.target.value)
            }
          />

          <button
            className="main-button"
            onClick={register}
          >
            Створити акаунт
          </button>

          <p className="auth-info">
            Акаунт зберігається на цьому пристрої.
          </p>

        </div>
      </div>
    );
  }

  // ==============================
  // MAIN APP
  // ==============================

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo">
          𝕏
        </div>

        <button
          className={
            page === "home"
              ? "nav active"
              : "nav"
          }
          onClick={() => setPage("home")}
        >
          <span className="nav-icon">
            🏠
          </span>

          <span>
            Головна
          </span>
        </button>

        <button
          className={
            page === "profile"
              ? "nav active"
              : "nav"
          }
          onClick={() => setPage("profile")}
        >
          <span className="nav-icon">
            👤
          </span>

          <span>
            Профіль
          </span>
        </button>

        <button
          className="nav logout"
          onClick={logout}
        >
          <span className="nav-icon">
            🚪
          </span>

          <span>
            Вийти
          </span>
        </button>

      </aside>

      {/* MAIN */}

      <main className="main">

        {/* =========================
            HOME
        ========================= */}

        {page === "home" && (
          <>

            <header className="topbar">
              <h2>
                Головна
              </h2>
            </header>

            {/* CREATE POST */}

            <section className="create-post">

              <img
                className="avatar"
                src={user.avatar}
                alt="avatar"
              />

              <div className="create-content">

                <textarea
                  placeholder="Що нового?"
                  value={postText}
                  onChange={(event) =>
                    setPostText(event.target.value)
                  }
                  maxLength={280}
                />

                {/* PHOTO PREVIEW */}

                {postImage && (
                  <div className="preview">

                    <img
                      src={postImage}
                      alt="preview"
                    />

                    <button
                      className="remove-image"
                      onClick={() =>
                        setPostImage(null)
                      }
                    >
                      ×
                    </button>

                  </div>
                )}

                {/* TOOLS */}

                <div className="post-tools">

                  <label className="photo-button">

                    🖼️
                    <span>
                      Фото
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImage}
                    />

                  </label>

                  <span className="counter">
                    {postText.length}/280
                  </span>

                  <button
                    className="post-button"
                    onClick={createPost}
                  >
                    Опублікувати
                  </button>

                </div>

              </div>

            </section>

            {/* FEED */}

            <section className="feed">

              {posts.length === 0 ? (

                <div className="empty">

                  <div className="empty-icon">
                    📝
                  </div>

                  <h3>
                    Поки немає постів
                  </h3>

                  <p>
                    Напиши перший пост!
                  </p>

                </div>

              ) : (

                posts.map((post) => (

                  <article
                    className="post"
                    key={post.id}
                  >

                    <img
                      className="avatar"
                      src={post.author.avatar}
                      alt="avatar"
                    />

                    <div className="post-body">

                      <div className="post-header">

                        <strong>
                          {post.author.name}
                        </strong>

                        <span>
                          @{post.author.username}
                        </span>

                        <span>
                          ·
                        </span>

                        <span>
                          {post.date}
                        </span>

                      </div>

                      {/* TEXT */}

                      {post.text && (
                        <p className="post-text">
                          {post.text}
                        </p>
                      )}

                      {/* IMAGE */}

                      {post.image && (
                        <img
                          className="post-image"
                          src={post.image}
                          alt="post"
                        />
                      )}

                      {/* ACTIONS */}

                      <div className="post-actions">

                        <button>
                          💬 {post.comments}
                        </button>

                        <button
                          className={
                            post.liked
                              ? "liked"
                              : ""
                          }
                          onClick={() =>
                            likePost(post.id)
                          }
                        >
                          ❤️ {post.likes}
                        </button>

                        <button>
                          ↗️
                        </button>

                        {post.author.id ===
                          user.id && (
                          <button
                            className="delete-button"
                            onClick={() =>
                              deletePost(post.id)
                            }
                          >
                            🗑️
                          </button>
                        )}

                      </div>

                    </div>

                  </article>

                ))

              )}

            </section>

          </>
        )}

        {/* =========================
            PROFILE
        ========================= */}

        {page === "profile" && (

          <div className="profile-page">

            <header className="topbar">

              <h2>
                Профіль
              </h2>

            </header>

            {/* COVER */}

            <div className="profile-cover">
            </div>

            {/* PROFILE */}

            <div className="profile-info">

              <img
                className="profile-avatar"
                src={user.avatar}
                alt="avatar"
              />

              <h1>
                {user.name}
              </h1>

              <p>
                @{user.username}
              </p>

              <p className="profile-description">
                👋 Привіт! Це мій профіль у Mini Social.
              </p>

              <div className="profile-stats">

                <div>
                  <strong>
                    {myPosts.length}
                  </strong>

                  <span>
                    Пости
                  </span>
                </div>

                <div>
                  <strong>
                    0
                  </strong>

                  <span>
                    Підписники
                  </span>
                </div>

                <div>
                  <strong>
                    0
                  </strong>

                  <span>
                    Підписки
                  </span>
                </div>

              </div>

            </div>

            {/* MY POSTS */}

            <div className="profile-posts">

              <h2>
                Мої пости
              </h2>

              {myPosts.length === 0 ? (

                <div className="empty">

                  <div className="empty-icon">
                    📭
                  </div>

                  <h3>
                    Тут поки порожньо
                  </h3>

                  <p>
                    Створи свій перший пост.
                  </p>

                </div>

              ) : (

                myPosts.map((post) => (

                  <article
                    className="post"
                    key={post.id}
                  >

                    <img
                      className="avatar"
                      src={post.author.avatar}
                      alt="avatar"
                    />

                    <div className="post-body">

                      <div className="post-header">

                        <strong>
                          {post.author.name}
                        </strong>

                        <span>
                          @{post.author.username}
                        </span>

                        <span>
                          ·
                        </span>

                        <span>
                          {post.date}
                        </span>

                      </div>

                      {post.text && (
                        <p className="post-text">
                          {post.text}
                        </p>
                      )}

                      {post.image && (
                        <img
                          className="post-image"
                          src={post.image}
                          alt="post"
                        />
                      )}

                      <div className="post-actions">

                        <button>
                          💬 {post.comments}
                        </button>

                        <button
                          className={
                            post.liked
                              ? "liked"
                              : ""
                          }
                          onClick={() =>
                            likePost(post.id)
                          }
                        >
                          ❤️ {post.likes}
                        </button>

                        <button
                          className="delete-button"
                          onClick={() =>
                            deletePost(post.id)
                          }
                        >
                          🗑️
                        </button>

                      </div>

                    </div>

                  </article>

                ))

              )}

            </div>

          </div>

        )}

      </main>

    </div>
  );
}

export default App;