$(document).ready(function() {
  // Tambien podriamos coger todos los enlaces $('a[href$=".webm"]').each(function() {
  posts = $("div").find("[name='HOTWordsTxt']").find("a")
  console.log(posts)
  posts.each(function(id){
    var expreg_url = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*).webm/g)
    if ($(this).text().match(expreg_url)){
      $(this).replaceWith('<meta name="referrer" content="no-referrer" /> \
      <video style="display:block; margin: 0 auto;" controls width="640" height="480">   \
      <source src="' + $(this).text() + '" type="video/webm"> \
      </video> \
      ')
    }
  })
})

$(window).scroll(function() {
  $('video').each(function(){
    if ($(this).is(":in-viewport(300)")) {
      $(this)[0].play();
    } else {
      $(this)[0].pause();
    }
  })
})
