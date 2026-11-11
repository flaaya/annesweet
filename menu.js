// Each item can also carry optional detail lines for its pop-up window. Add them only when they are true for that cake:
//   ingredients: "Flour, sugar, eggs, ...", contains: "Wheat, eggs, milk", calories: "About 380 per slice"
// A line only appears in the window once it is filled in.
//
// OWNER: this list and every price below are drafts built from AnneSweet's own Facebook (facebook.com/annesweetph)
// and Pinterest (pinterest.com/annesweetph) photos, replacing an earlier placeholder menu that didn't match what
// the page actually sells. Please confirm or correct:
//   - all 12 cake names and whether this is the full lineup (there's no public price list anywhere)
//   - every price (8-inch and 10-inch), which are guesses in a similar range to what she used to charge. Note: her
//     own Pinterest photos are each captioned with a single size, 9-inch for most and 7-inch for Belgian Chocolate
//     and Red Velvet, not 8/10-inch — worth checking whether she still wants two sizes per cake or her usual single size
//   - the pastry section, cut down to the one item with a real photo (Pistachio Chocolate Cupcakes); add back
//     Brownies/Cookies/Ensaymada or others once there are real photos and a confirmed price for each
//   - "Pistachio Kataifi Chocolate Cake" was posted as a limited-time item, so it's left off this list on purpose
const MENU = [
  { id: "mixed-chocolate-overload", name: "Mixed Chocolate Overload", category: "cake", description: "Rich chocolate cake topped with a chocolate drip and loaded with Ferrero Rocher, Oreo, wafer rolls and chocolate pearls.", photo: "photos/real/mixed-chocolate-overload.jpg", sizes: [{ label: "8-inch", price: 950 }, { label: "10-inch", price: 1250 }], tags: ["Bestseller"], soldOut: false },
  { id: "banoffee-cheesecake", name: "Banoffee Cheesecake", category: "cake", description: "Creamy cheesecake with a caramel swirl top, finished with a ring of fresh banana.", photo: "photos/real/banoffee-cheesecake.jpg", sizes: [{ label: "8-inch", price: 1050 }, { label: "10-inch", price: 1350 }], tags: [], soldOut: false },
  { id: "biscoff-cheesecake", name: "Biscoff Cheesecake", category: "cake", description: "Baked cheesecake with a Biscoff swirl top and a crushed-biscuit edge.", photo: "photos/real/biscoff-cheesecake.jpg", sizes: [{ label: "8-inch", price: 1050 }, { label: "10-inch", price: 1350 }], tags: [], soldOut: false },
  { id: "oreo-overload-cheesecake", name: "Oreo Overload Cheesecake", category: "cake", description: "Cheesecake piled with crushed Oreo and whipped cream swirls.", photo: "photos/real/oreo-overload-cheesecake.jpg", sizes: [{ label: "8-inch", price: 1050 }, { label: "10-inch", price: 1350 }], tags: [], soldOut: false },
  { id: "blueberry-cheesecake", name: "Blueberry Cheesecake", category: "cake", description: "Baked cheesecake topped with a blueberry compote inside a whipped cream border.", photo: "photos/real/blueberry-cheesecake.jpg", sizes: [{ label: "8-inch", price: 1000 }, { label: "10-inch", price: 1300 }], tags: [], soldOut: false },
  { id: "fresh-fruit-cake", name: "Fresh Fruit Cake", category: "cake", description: "Soft vanilla sponge, whipped cream and a generous topping of fresh seasonal fruit.", photo: "photos/real/fresh-fruit-cake.jpg", sizes: [{ label: "8-inch", price: 950 }, { label: "10-inch", price: 1250 }], tags: ["Bestseller"], soldOut: false },
  { id: "avocado-cream-cake", name: "Avocado Cream Cake", category: "cake", description: "Avocado-flavoured cream cake with a glossy avocado glaze and a whipped cream border.", photo: "photos/real/avocado-cream-cake.jpg", sizes: [{ label: "8-inch", price: 950 }, { label: "10-inch", price: 1250 }], tags: [], soldOut: false },
  { id: "mango-cream-cake", name: "Mango Cream Cake", category: "cake", description: "Mango-flavoured cream cake with a glossy mango glaze, whipped cream rosettes and mango pearls.", photo: "photos/real/mango-cream-cake.jpg", sizes: [{ label: "8-inch", price: 950 }, { label: "10-inch", price: 1250 }], tags: [], soldOut: false },
  { id: "creme-brulee-cake", name: "Crème Brûlée Cake", category: "cake", description: "Layered cake finished with a torched sugar top, like a classic crème brûlée.", photo: "photos/real/creme-brulee-cake.jpg", sizes: [{ label: "8-inch", price: 1100 }, { label: "10-inch", price: 1450 }], tags: ["Bestseller"], soldOut: false },
  { id: "ube-creme-brulee-cake", name: "Ube Crème Brûlée Cake", category: "cake", description: "Ube layers under a torched sugar top, like a classic crème brûlée with an ube twist.", photo: "photos/real/ube-creme-brulee-cake.jpg", sizes: [{ label: "8-inch", price: 1100 }, { label: "10-inch", price: 1450 }], tags: [], soldOut: false },
  { id: "belgian-chocolate-cake", name: "Belgian Chocolate Cake", category: "cake", description: "Belgian chocolate cake with a chocolate drip, piped chocolate cream and toasted almond flakes.", photo: "photos/real/belgian-chocolate-cake.jpg", sizes: [{ label: "8-inch", price: 1000 }, { label: "10-inch", price: 1300 }], tags: [], soldOut: false },
  { id: "red-velvet-cake", name: "Red Velvet Cake", category: "cake", description: "Classic red velvet cake with cream cheese frosting and a ring of red velvet crumbs.", photo: "photos/real/red-velvet-cake.jpg", sizes: [{ label: "8-inch", price: 950 }, { label: "10-inch", price: 1250 }], tags: [], soldOut: false },
  { id: "pistachio-chocolate-cupcakes", name: "Pistachio Chocolate Cupcakes", category: "pastry", description: "Chocolate cupcakes swirled with chocolate frosting and crushed pistachios. Box of 6.", photo: "photos/real/pistachio-chocolate-cupcakes.jpg", sizes: [{ label: "Box of 6", price: 320 }], tags: [], soldOut: false },
];
