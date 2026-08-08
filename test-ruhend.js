const { ytdown } = require("ruhend-scraper");
ytdown('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
.then(data => {
    console.log("Success:", data);
})
.catch(e => {
    console.error("Error:", e.message);
});
