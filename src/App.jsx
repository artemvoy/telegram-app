import { useState } from "react";
import "./index.css";
import WebApp from "@twa-dev/sdk";

WebApp.ready();
WebApp.expand();

const products = [
  {
    id: 1,
    title: "iPhone 14 Pro",
    price: 24500,
    city: "Житомир",
    category: "Телефони",
    image: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=800&q=80",
    description:
      "iPhone 14 Pro у відмінному стані. 256 GB пам'яті. Face ID працює. Комплект повний."
  },
  {
    id: 2,
    title: "PlayStation 5",
    price: 18500,
    city: "Київ",
    category: "Ігри",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80",
    description:
      "PlayStation 5 у хорошому стані. Один геймпад. Повністю справна."
  },
  {
    id: 3,
    title: "MacBook Air M2",
    price: 36000,
    city: "Львів",
    category: "Ноутбуки",
    image: "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    description:
      "MacBook Air на M2. 8/256 GB. Батарея у відмінному стані."
  },
  {
    id: 4,
    title: "Nike Air Max",
    price: 3200,
    city: "Одеса",
    category: "Одяг",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
    description:
      "Оригінальні Nike Air Max. Розмір 42. Стан майже новий."
  },
  {
    id: 5,
    title: "Gaming PC RTX 4070",
    price: 55000,
    city: "Харків",
    category: "Комп'ютери",
    image: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=800&q=80",
    description:
      "Потужний ігровий ПК. RTX 4070, Ryzen 7, 32 GB RAM."
  },
  {
    id: 6,
    title: "Samsung Galaxy S24",
    price: 27000,
    city: "Дніпро",
    category: "Телефони",
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&q=80",
    description:
      "Samsung Galaxy S24. 256 GB. Стан нового телефону."
  }
];

const categories = [
  "Всі",
  "Телефони",
  "Ноутбуки",
  "Комп'ютери",
  "Ігри",
  "Одяг"
];

function App() {
  const user = WebApp.initDataUnsafe?.user;
  const [page, setPage] = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Всі");

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const filteredProducts = products.filter((product) => {
    const searchMatch =
      product.title.toLowerCase().includes(search.toLowerCase());

    const categoryMatch =
      category === "Всі" || product.category === category;

    return searchMatch && categoryMatch;
  });

  const openProduct = (product) => {
    setSelectedProduct(product);
    setPage("product");
  };

  const goHome = () => {
    setSelectedProduct(null);
    setPage("home");
  };

  return (
    <div className="app">
            <h1>
      Привіт, {user?.first_name || "користувач"} 👋
    </h1>
      <header className="header">
        <div className="logo" onClick={goHome}>
          <div className="logo-icon">T</div>
          <span>T-SELL</span>
        </div>

        <button
          className="profile-button"
          onClick={() => setPage("profile")}
        >
          👤
        </button>
      </header>

      {page === "home" && (
        <main>

          <section className="hero">
            <h1>Знайди те, що шукаєш</h1>
            <p>Купуй та продавай товари прямо в Telegram</p>

            <div className="search">
              <span>🔎</span>

              <input
                type="text"
                placeholder="Пошук товарів..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </section>

          <section className="categories">

            <h2>Категорії</h2>

            <div className="category-list">

              {categories.map((item) => (
                <button
                  key={item}
                  className={
                    category === item
                      ? "category active"
                      : "category"
                  }
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}

            </div>

          </section>

          <section className="products">

            <div className="section-title">
              <h2>Нові оголошення</h2>
              <span>{filteredProducts.length} товарів</span>
            </div>

            <div className="product-grid">

              {filteredProducts.map((product) => (

                <div
                  className="product-card"
                  key={product.id}
                  onClick={() => openProduct(product)}
                >

                  <div className="image-container">

                    <img
                      src={product.image}
                      alt={product.title}
                    />

                    <button
                      className="favorite"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(product.id);
                      }}
                    >
                      {favorites.includes(product.id) ? "❤️" : "♡"}
                    </button>

                  </div>

                  <div className="product-info">

                    <h3>{product.title}</h3>

                    <div className="price">
                      {product.price.toLocaleString("uk-UA")} грн
                    </div>

                    <div className="location">
                      📍 {product.city}
                    </div>

                  </div>

                </div>

              ))}

            </div>

          </section>

        </main>
      )}

      {page === "product" && selectedProduct && (

        <main className="product-page">

          <button
            className="back-button"
            onClick={goHome}
          >
            ← Назад
          </button>

          <img
            className="product-big-image"
            src={selectedProduct.image}
            alt={selectedProduct.title}
          />

          <div className="product-details">

            <div className="product-top">

              <div>

                <h1>{selectedProduct.title}</h1>

                <div className="big-price">
                  {selectedProduct.price.toLocaleString("uk-UA")} грн
                </div>

              </div>

              <button
                className="big-favorite"
                onClick={() => toggleFavorite(selectedProduct.id)}
              >
                {favorites.includes(selectedProduct.id)
                  ? "❤️"
                  : "♡"}
              </button>

            </div>

            <div className="detail-location">
              📍 {selectedProduct.city}
            </div>

            <div className="description">

              <h2>Опис</h2>

              <p>{selectedProduct.description}</p>

            </div>

            <div className="seller">

              <div className="seller-avatar">
                A
              </div>

              <div>
                <strong>Артем</strong>
                <span>Продавець</span>
              </div>

            </div>

            <button className="contact-button">
              💬 Написати продавцю
            </button>

          </div>

        </main>

      )}

      {page === "profile" && (

        <main className="profile-page">

          <div className="profile-avatar">
            A
          </div>

          <h1>Артем</h1>

          <p>@telegram_user</p>

          <div className="profile-buttons">

            <button>
              📦 Мої оголошення
            </button>

            <button>
              ❤️ Обране ({favorites.length})
            </button>

            <button
              onClick={() => setPage("add")}
            >
              ➕ Додати оголошення
            </button>

          </div>

        </main>

      )}

      {page === "add" && (

        <main className="add-page">

          <button
            className="back-button"
            onClick={() => setPage("profile")}
          >
            ← Назад
          </button>

          <h1>Нове оголошення</h1>

          <div className="form">

            <label>Назва товару</label>
            <input placeholder="Наприклад: iPhone 15" />

            <label>Ціна</label>
            <input
              type="number"
              placeholder="Ціна в гривнях"
            />

            <label>Місто</label>
            <input placeholder="Житомир" />

            <label>Категорія</label>

            <select>
              {categories
                .filter((item) => item !== "Всі")
                .map((item) => (
                  <option key={item}>
                    {item}
                  </option>
                ))}
            </select>

            <label>Опис</label>

            <textarea
              placeholder="Опишіть свій товар..."
              rows="5"
            />

            <button className="publish-button">
              Опублікувати
            </button>

          </div>

        </main>

      )}

      <nav className="bottom-nav">

        <button
          className={page === "home" ? "nav-active" : ""}
          onClick={goHome}
        >
          <span>🏠</span>
          Головна
        </button>

        <button
          onClick={() => setPage("add")}
        >
          <span className="add-icon">+</span>
          Продати
        </button>

        <button
          className={page === "profile" ? "nav-active" : ""}
          onClick={() => setPage("profile")}
        >
          <span>👤</span>
          Профіль
        </button>

      </nav>

    </div>
  );
}

export default App;