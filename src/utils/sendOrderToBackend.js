export const sendOrderToBackend = async () => {
    const cart = JSON.parse(localStorage.getItem("food_cart"));
  
    if (!cart || !cart.items?.length) {
      alert("Cart is empty");
      return;
    }
  
    const payload = {
      chat_id: window.Telegram.WebApp.initDataUnsafe?.user?.id,
      phone: cart.phone,
      address: cart.order_type === "delivery" ? cart.address : null,
      order_type: cart.order_type,
      items: cart.items,
      total_price: cart.total_price
    };
  
    try {
      const res = await fetch("https://food-bot-vulm.onrender.com/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": window.Telegram.WebApp.initData || ""
        },
        body: JSON.stringify(payload)
      });
  
      const data = await res.json();
  
      if (res.ok) {
        alert("Order placed successfully!");
        localStorage.removeItem("food_cart");
        // Optional: Telegram.WebApp.close();
      } else {
        alert(data.detail || "Failed to place order");
      }
  
    } catch (err) {
      console.error("Order error:", err);
      alert("Something went wrong!");
    }
  };
  