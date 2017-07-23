// // $(document).ready(function() {
// //     chrome.storage.sync.clear();
// // });

$(document).ready(function() {
  $.material.init();
  $('#options').click(function(){
    chrome.tabs.create({url: "options.html"});
    return false;
  });
})

$(document).ready(function() {
  chrome.storage.sync.get(['banwords', 'banusers'], function(data) {
    $('form').on('submit', function(e) {
      e.preventDefault();
      form = $(this).attr('id')
      button = $("button",this)
      textarea = $("input", this)
      string_palabras = textarea.val().toLowerCase().replace(/( *, *,*)/g, ",").trim()
      console.log(string_palabras)
      string_palabras = escapeRegExp(string_palabras)
      console.log(string_palabras)
      string_palabras = string_palabras.split("\,")
      if (string_palabras[string_palabras.length-1] == ""){
        string_palabras.splice(string_palabras.length-1, 1 );
      }
      console.log(string_palabras)
      var datatosync = {}
      if(data[form] !== undefined){
        datatosync[form] = data[form].concat(string_palabras)
        } else{
      datatosync[form] = string_palabras
    }
      chrome.storage.sync.set(datatosync, function() {
        // Notify that we saved.
        console.log("Guardado correctamente")
        button.addClass("btn-success btn-raised")
        setTimeout(function(){
          button.removeClass("btn-success btn-raised")
        }, 1000);
      });
    });
  });
});

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&');
}
