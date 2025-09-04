import React from "react";
import { useNavigate } from "react-router-dom";
import { FaStar, FaHeart } from "react-icons/fa";
import "./restaurant.css";

const categories = ["Fast Food", "Mexican", "Retail", "Offers"];
const filters = ["Delivery fee", "Under 30 min", "Best overall", "Rating", "Price", "Dietary", "Sort"];

const restaurants = [
  {
    id: 1,
    name: "Speedy Cafe",
    image: "/images/speedy-cafe.jpg",
    rating: 4.5,
    status: "Open",
    offer: "25% off (Spend $25)",
  },
  {
    id: 2,
    name: "BIBIBOP Delaware, OH",
    image: "/images/bibibop.jpg",
    rating: 4.6,
    status: "Closed",
  },
  {
    id: 3,
    name: "Auntie Anne's",
    image: "/images/auntie-annes.jpg",
    rating: 4.3,
    status: "Closed",
  },
];

const RestaurantPage = () => {
  const navigate = useNavigate();

  const handleSelectRestaurant = (restaurant) => {
    if (restaurant.status === "Closed") return;
    navigate("/menu", { state: { restaurant } });
  };

  return (
    <div className="restaurant-page">
      <div className="categories">
        {categories.map((cat) => (
          <button key={cat} className="category-btn">{cat}</button>
        ))}
      </div>

      <div className="filters">
        {filters.map((filter) => (
          <button key={filter} className="filter-btn">{filter}</button>
        ))}
      </div>

      <h2 className="title">All Stores</h2>
      <div className="restaurant-grid">
        {restaurants.map((restaurant) => (
          <div
            key={restaurant.id}
            className={`restaurant-card ${restaurant.status === "Closed" ? "closed" : ""}`}
            onClick={() => handleSelectRestaurant(restaurant)}
          >
            <div className="restaurant-image">
              {restaurant.offer && <span className="offer-badge">{restaurant.offer}</span>}
              <img src={restaurant.image} alt={restaurant.name} />
              {restaurant.status === "Closed" && <div className="closed-overlay">Closed</div>}
            </div>
            <div className="restaurant-info">
              <h3>{restaurant.name}</h3>
              <div className="restaurant-meta">
                <FaStar className="star-icon" /> {restaurant.rating}
                <FaHeart className="fav-icon" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestaurantPage;
