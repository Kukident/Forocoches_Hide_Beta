// $(document).ready(function() {
//     chrome.storage.sync.clear();
// });

$(document).ready(function() {
  banwords = null
  chrome.storage.sync.get(['banwords', "options"], function(data) {
    if (data.options !== undefined){
      options = data["options"]
      console.log(options)
      //$('#ocultar').bootstrapToggle(options["ocultar"])
      //$('#oscurecer').bootstrapToggle(options["oscurecer"])
      $('#ocultar').attr('checked', options["ocultar"])
      $('#oscurecer').attr('checked', options["oscurecer"])
    }
    else{
      //$('#ocultar').bootstrapToggle("off")
      //$('#oscurecer').bootstrapToggle("on")
      $('#ocultar').attr('checked', false)
      $('#oscurecer').attr('checked', true)
      options["ocultar"] = false
      options["oscurecer"] = true
      save_options()
    }

    banwords = data["banwords"]
    $("#lista").val(banwords.join(", ").replace(/[\\]/g,''));

  });


  $('#banwords').on('submit', function(e) {
    e.preventDefault();
    string_palabras = $("#lista").val().toLowerCase().replace(/( *, *,*)/g, ",").trim()
    console.log(string_palabras)
    string_palabras = escapeRegExp(string_palabras)
    console.log(string_palabras)
    string_palabras = string_palabras.split("\,")
    if (string_palabras[string_palabras.length-1] == ""){
      string_palabras.splice(string_palabras.length-1, 1 );
    }
    console.log(string_palabras)
    var datatosync = {}
    datatosync["banwords"] = string_palabras
    chrome.storage.sync.set(datatosync, function() {
      // Notify that we saved.
      console.log("Guardado correctamente")
      $("#guardar_palabras").addClass("btn-success btn-raised")
      setTimeout(function(){
        $("#guardar_palabras").removeClass("btn-success btn-raised")
      }, 1000);
    });
  });

});

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&');
}

var options = {}
$(function() {
  $('#ocultar').change(function() {
    console.log("ocultar")
    if ($(this).prop('checked')){
      //$('#oscurecer').bootstrapToggle('off')
      options["ocultar"] = true
    }
    else{
      options["ocultar"] = false
    }
    save_options()
  })
  $('#oscurecer').change(function() {
    console.log("oscurecer")
    if ($(this).prop('checked')){
      //$('#ocultar').bootstrapToggle('off')
      options["oscurecer"] = true
    }
    else{
      options["oscurecer"] = false
    }
    save_options()
  })
})

function save_options(){
  console.log("guardando opciones")
  var datatosync = {}
  console.log(options)
  datatosync["options"] = options
  chrome.storage.sync.set(datatosync, function() {
    // Notify that we saved.
    console.log("Guardado correctamente")
  });

}
