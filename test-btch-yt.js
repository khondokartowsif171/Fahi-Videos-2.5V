const btch = require("btch-downloader");
btch.youtube('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
.then(data => {
    console.log("Success:", JSON.stringify(data, null, 2));
})
.catch(e => {
    console.error("Error:", e.message);
});
