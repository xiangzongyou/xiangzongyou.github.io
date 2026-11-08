// Click-to-load YouTube embeds: show the thumbnail until the visitor presses play.
document.querySelectorAll(".video[data-yt]").forEach(function (box) {
  var btn = box.querySelector(".video-play");
  if (!btn) return;
  btn.addEventListener("click", function () {
    var f = document.createElement("iframe");
    f.src = "https://www.youtube-nocookie.com/embed/" + box.dataset.yt + "?autoplay=1&rel=0";
    f.title = btn.getAttribute("aria-label") || "YouTube video";
    f.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
    f.allowFullscreen = true;
    box.replaceChildren(f);
  });
});
