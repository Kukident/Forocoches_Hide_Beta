$(document).ready(function() {
  // Tambien podriamos coger todos los enlaces $('a[href$=".webm"]').each(function() {
  posts = $("div").find("[name='HOTWordsTxt']").find("a")
  //console.log(posts)
  posts.each(function(id){
    var expreg_url = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*).webm/g)
    if (this.href.match(expreg_url)){
      $(this).replaceWith('<meta name="referrer" content="no-referrer" /> \
      <video muted style="display:block; margin: 0 auto;" controls width="640" height="360">   \
      <source src="' + $(this).text() + '" type="video/webm"> \
      </video> \
      ')
    }
  })

  var vids = document.querySelectorAll("video");
  // for all the videos in the page
  for (var x = 0; x < vids.length; x++) {
    // add an event listening for errors
    vids[x].addEventListener('error', function(e) {
      // if the error is caused by the video not loading
      if (this.networkState > 2) {
        // add an image with the message "video not found"
        this.setAttribute("poster", "http://dummyimage.com/312x175/000/fff.jpg&text=Video+Not+Found");
      }
    }, true);
  }


  /* Drag'n drop stuff */
  $('#vB_Editor_QR').on('dragover', add_background_textarea)
  $('#vB_Editor_QR').on('dragleave', remove_background_textarea)

  function add_background_textarea() {
    css_style = {
      'background-image': 'url(https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Imgur_logo.svg/1200px-Imgur_logo.svg.png)',
      'background-size': '200px',
      'background-repeat': 'no-repeat',
      'background-position': 'center',
    }
    $('#vB_Editor_QR_textarea').css(css_style)
  }

  function remove_background_textarea(){
    css_style = {
      'background-image': '',
      'background-size': '',
      'background-repeat': '',
      'background-position': '',}
    $('#vB_Editor_QR_textarea').css(css_style)
  }

  $('#vB_Editor_QR').on('drop', function(e) {
    remove_background_textarea()
    let file = e.originalEvent.dataTransfer.files[0]
    // if (file && file.type.match(/image.*/)){
      e.preventDefault();
      e.stopPropagation();
      upload(file);

    // }
  })

  function upload(file) {
    var fd = new FormData();
    fd.append("image", file);
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.imgur.com/3/image.json");
    xhr.onload = function () {
      if (JSON.parse(xhr.responseText).success) {
        upload_image_status_animation('palegreen')
        let imgur_link = '[IMG]' + JSON.parse(xhr.responseText).data.link + '[/IMG]'
        $('#vB_Editor_QR_textarea').val($('#vB_Editor_QR_textarea').val() + imgur_link)
        console.debug(imgur_link)
      }
      else{
        console.error('Error subiendo imagen a imgur')
        upload_image_status_animation('indianred')
      }
    }
    xhr.onerror = function () {
      console.error('Error subiendo imagen a imgur')
      upload_image_status_animation('indianred')
    }
      xhr.setRequestHeader('Authorization', 'Client-ID 49e09bca2e0bbd8');
      xhr.send(fd);

  }

  function upload_image_status_animation(color) {
    document.getElementById("vB_Editor_QR_textarea").animate([
      // keyframes
      {background: color},
      {background: 'white'}
    ], {
      // timing options
      duration: 1500
    });
  }

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
