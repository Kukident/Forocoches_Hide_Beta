$(document).ready(function() {
  var url = ""
  var foro = ""
  $.material.init();

  chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    url = tabs[0].url
    foro = GetURLParameter(url, 'f')
    if (url.indexOf("forocoches.com") !== -1 && foro !== undefined){
      $("#filtrado").prepend("<div class='row text-center'>" + foros[foro][0] + "<div>")
    }
    else{
      $("#filtrado :input").attr("disabled", true);
      $("#filtrado").prepend("<div class='row text-center text-danger'>Actualmente no te encuentras en ningún foro<div>")
    }
  });

  $('#options').click(function(){
    chrome.tabs.create({url: "options.html"});
    return false;
  });


  $('form').on('submit', function(e) {
    e.preventDefault();
    form = $(this).attr('id')
    button = $("button",this)
    textarea = $("input", this)
    string_palabras = textarea.val().toLowerCase().replace(/( *, *,*)/g, ",").trim()
    string_palabras = escapeRegExp(string_palabras)
    string_palabras = string_palabras.split("\,")
    if (string_palabras[string_palabras.length-1] == ""){
      string_palabras.splice(string_palabras.length-1, 1 );
    }
    chrome.storage.sync.get(null, function(data) {
      filtrar = parse_data(data, foro)
      //filtrar[foro]["ocultar"][form] = filtrar[foro]["ocultar"][form].concat(string_palabras)
      var result = get_filtrar(data, foro)

      //Al guardar desde el popup activamos el foro
      pos = $.inArray(foro, filtrar["options"]["foros_usados"])
      if (pos === -1){
        filtrar["options"]["foros_usados"].push(foro)
      }

      var datatosync = {}
      datatosync["filtrar"] = filtrar
      save_words(datatosync, result[form].concat(string_palabras), foro, form)
    });
  });
});
