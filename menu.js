// Each item can also carry optional detail lines for its pop-up window. Add them only when they are true for that cake:
//   ingredients: "Flour, sugar, eggs, ...", contains: "Wheat, eggs, milk", calories: "About 380 per slice"
// A line only appears in the window once it is filled in.
//
// OWNER: this list and every price below are drafts built from AnneSweet's own Facebook photos (facebook.com/annesweetph),
// replacing an earlier placeholder menu that didn't match what the page actually sells. Please confirm or correct:
//   - the 6 cake names and whether this is the full lineup (her FB page has no public price list)
//   - every price (8-inch and 10-inch), which are guesses in a similar range to what she used to charge
//   - the pastry section, cut down to the one item with a real photo (Pistachio Chocolate Cupcakes); add back
//     Brownies/Cookies/Ensaymada or others once there are real photos and a confirmed price for each
//   - "Pistachio Kataifi Chocolate Cake" was posted as a limited-time item, so it's left off this list on purpose
const MENU = [
  { id: "chocolate-cake", name: "Mixed Chocolate Overload", category: "cake", description: "Rich chocolate cake topped with a chocolate drip and loaded with Ferrero Rocher, Oreo, wafer rolls and chocolate pearls.", photo: "photos/real/mixed-chocolate-overload.jpg", sizes: [{ label: "8-inch", price: 950 }, { label: "10-inch", price: 1250 }], tags: ["Bestseller"], soldOut: false },
  { id: "ube-cake", name: "Banoffee Cheesecake", category: "cake", description: "Creamy cheesecake with a caramel swirl top, finished with a ring of fresh banana.", photo: "photos/real/banoffee-cheesecake.jpg", sizes: [{ label: "8-inch", price: 1050 }, { label: "10-inch", price: 1350 }], tags: ["Bestseller"], soldOut: false },
  { id: "mocha-cake", name: "Biscoff Cheesecake", category: "cake", description: "Baked cheesecake with a Biscoff swirl top and a crushed-biscuit edge.", photo: "photos/real/biscoff-cheesecake.jpg", sizes: [{ label: "8-inch", price: 1050 }, { label: "10-inch", price: 1350 }], tags: [], soldOut: false },
  { id: "red-velvet-cake", name: "Oreo Overload Cheesecake", category: "cake", description: "Cheesecake piled with crushed Oreo and whipped cream swirls.", photo: "photos/real/oreo-overload-cheesecake.jpg", sizes: [{ label: "8-inch", price: 1050 }, { label: "10-inch", price: 1350 }], tags: [], soldOut: false },
  { id: "caramel-cake", name: "Blueberry Cheesecake", category: "cake", description: "Baked cheesecake topped with a blueberry compote inside a whipped cream border.", photo: "photos/real/blueberry-cheesecake.jpg", sizes: [{ label: "8-inch", price: 1000 }, { label: "10-inch", price: 1300 }], tags: [], soldOut: false },
  { id: "lemon-cake", name: "Fresh Fruit Cake", category: "cake", description: "Soft vanilla sponge, whipped cream and a generous topping of fresh seasonal fruit.", photo: "photos/real/fresh-fruit-cake.jpg", sizes: [{ label: "8-inch", price: 950 }, { label: "10-inch", price: 1250 }], tags: ["New"], soldOut: false },
  { id: "cupcakes", name: "Pistachio Chocolate Cupcakes", category: "pastry", description: "Chocolate cupcakes swirled with chocolate frosting and crushed pistachios. Box of 6.", photo: "photos/real/pistachio-chocolate-cupcakes.jpg", sizes: [{ label: "Box of 6", price: 320 }], tags: [], soldOut: false },
];
