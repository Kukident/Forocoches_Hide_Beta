// // $(document).ready(function() {
// //     chrome.storage.sync.clear();
// // });

var foros = {
  "2": ["General"],
  "17": ["Electrónica / Informática"],
  "82": ["Fotografía", 17],
  "26": ["Empleo"],
  "64": ["Taxi", 26],
  "27": ["Viajes"],
  "15": ["Quedadas (KDD)"],
  "4": ["ForoCoches"],
  "18": ["Competición"],
  "20": ["Clásicos"],
  "65": ["Compra - Venta Clasicos", 20],
  "47": ["Monovolumentes"],
  "21": ["4x4 / Ocio"],
  "79": ["Compra - Venta 4x4 / Ocio", 21],
  "28": ["Modelismo"],
  "70": ["Compra - Venta Modelismo", 28],
  "76": ["Camiones / Furgones / Autobuses"],
  "48": ["Motos"],
  "80": ["Compra - Venta Motos", 48],
  "19": ["Mecánica"],
  "5": ["Car-Audio"],
  "31": ["Seguros"],
  "87": ["Promos Seguros", 31],
  "30": ["Tráfico / Radares"],
  "6": ["Tuning"],
  "16": ["Juegos de Coches"],
  "43": ["Juegos Online"],
  "85": ["Plan PIVE"],
  "34": ["Compra - Venta Profesional"],
  "11": ["Compra - Venta Motor"],
  "25": ["Compra - Venta Audio / Tuning"],
  "22": ["Compra - Venta Electrónica"],
  "69": ["Compra - Venta General"],
  "12": ["Info / Ayuda"],
  "8": ["Ayuda"]
}
$(document).ready(function() {
  var url = ""
  var foro = ""
  $.material.init();

  chrome.tabs.query({currentWindow: true, active: true}, function(tabs){
    url = tabs[0].url
    foro = GetURLParameter(url, 'f')
    console.log(tabs[0].url);
    console.log(foro)
    if (url.indexOf("forocoches.com") !== -1 && foro !== undefined){
      $("#filtrado").prepend("<div class='row text-center'>" + foros[foro] + "<div>")
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
// })
//
//
// $(document).ready(function() {
  chrome.storage.sync.get(['banwords', 'banusers', 'filtrar'], function(data) {
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

      if (data['filtrar'] !== undefined){
        filtrar = data['filtrar']

        if (data['filtrar']["options"] == undefined){
          filtrar["options"] = {}
        }

        if (data['filtrar'][foro] == undefined){
          filtrar[foro] = {}
          filtrar[foro]["ocultar"] = {}
          filtrar[foro]["ocultar"][form] = []
        }
        else {
          if (data['filtrar'][foro]["ocultar"] == undefined){
            filtrar[foro]["ocultar"] = {}
            filtrar[foro]["ocultar"][form] = []
          }
          else{

            if (data['filtrar'][foro]["ocultar"][form] !== undefined){
              filtrar[foro]["ocultar"][form] = data['filtrar'][foro]["ocultar"][form].concat(string_palabras)
            }
            else{
              filtrar[foro]["ocultar"][form] = string_palabras
            }
          }
        }
      }
      else{
        filtrar[foro] = {}
        filtrar[foro]["ocultar"] = {}
        filtrar[foro]["ocultar"]["banwords"] = []
        filtrar[foro]["ocultar"]["banusers"] = []
        filtrar["options"] = {}
      }

      var datatosync = {}
      datatosync["filtrar"] = filtrar

      // var datatosync = {}
      // if(data[form] !== undefined){
      //   datatosync[form] = data[form].concat(string_palabras)
      // } else{
      //   datatosync[form] = string_palabras
      // }
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

function GetURLParameter(url, sParam){
  var url_element = document.createElement('a');
  url_element.href = url
  var sPageURL = url_element.search.substring(1);
  var sURLVariables = sPageURL.split('&');
  for (var i = 0; i < sURLVariables.length; i++)
  {
    var sParameterName = sURLVariables[i].split('=');
    if (sParameterName[0] == sParam)
    {
      return sParameterName[1];
    }
  }
}
