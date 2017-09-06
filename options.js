// $(document).ready(function() {
//     chrome.storage.sync.clear();
// });
$(document).ready(function() {
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
  // var dropdown_content = '<li><a>'Dropdown link'</a></li>'
  // $(".dropdown-menu").html("huehue")
  //var foros_usados = []

  $.material.init();
  get_db("2", true)
  var filtrar = []


  function get_db(foro, options2=false){
    chrome.storage.sync.get(['banwords', 'banusers', 'filtrar', 'options'], function(data) {
      console.log(data)
      var banwords = []
      var banusers = []
      if (data.options !== undefined){
        options = data["options"]
        console.log(options)
        //$('#ocultar').bootstrapToggle(options["ocultar"])
        //$('#oscurecer').bootstrapToggle(options["oscurecer"])
        $('#ocultar').attr('checked', options["ocultar"])
        // $('#oscurecer').attr('checked', options["oscurecer"])
      }
      else{
        //$('#ocultar').bootstrapToggle("off")
        //$('#oscurecer').bootstrapToggle("on")
        $('#ocultar').attr('checked', true)
        // $('#oscurecer').attr('checked', true)
        options["ocultar"] = true
        // options["oscurecer"] = true
        save_options()
      }
      // if (data.banwords !== undefined){
      //   banwords = data["banwords"]
      // }
      // if(data.banusers !== undefined){
      //   banusers = data["banusers"]
      // }
      if (data['filtrar'] !== undefined){
        filtrar = data['filtrar']

        if (data['filtrar']["options"] == undefined){
          filtrar["options"] = {}
        }

        if (data['filtrar'][foro] == undefined){
          filtrar[foro] = {}
          filtrar[foro]["ocultar"] = {}
          filtrar[foro]["ocultar"]["banwords"] = []
          filtrar[foro]["ocultar"]["banusers"] = []
        }
        else {
          if (data['filtrar'][foro]["ocultar"] == undefined){
            filtrar[foro]["ocultar"] = {}
            filtrar[foro]["ocultar"]["banwords"] = []
            filtrar[foro]["ocultar"]["banusers"] = []
          }
          else{

            if (data['filtrar'][foro]["ocultar"]["banwords"] !== undefined){
              banwords = data['filtrar'][foro]["ocultar"]["banwords"]
            }
            else{
              filtrar[foro]["ocultar"]["banwords"] = banwords
            }
            if(data['filtrar'][foro]["ocultar"]["banusers"] !== undefined){
              banusers = data['filtrar'][foro]["ocultar"]["banusers"]
            }
            else{
              filtrar[foro]["ocultar"]["banusers"] = banusers
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


      //DEPRECATED: Borrar codigo, util cuando utilizabamos textarea en vez de materialtags
      //$("#lista").val(banwords.join(", ").replace(/[\\]/g,''));
      // $("#lista2").val(banusers.join(", ").replace(/[\\]/g,''));
      if (filtrar["options"]["foros_usados"] == undefined){
        filtrar["options"]["foros_usados"] = ['2']
      }
      if (options2){
        filtrar["options"]["foros_usados"].forEach(function(id){
          add_button_foro(id)
        })
      }
      $("#lista").materialtags("add",banwords.join(", ").replace(/[\\]/g,''))
      $("#lista2").materialtags("add",banusers.join(", ").replace(/[\\]/g,''))
    });
  }
  /*********************Seleccionar foros*********************/


  for (var key in foros){
    if (foros[key][0] === "General"){
      continue
    }
    $(".dropdown-menu").append('<li class="foro" id="' + key + '"><a>'+ foros[key][0] +'</a></li>')

  }
  $('.foro').on('click', function(e){
    id = $(this).attr('id')
    pos = $.inArray(id, filtrar["options"]["foros_usados"])
    if (pos === -1){
      add_button_foro(id)
      filtrar["options"]["foros_usados"].push(id)
    }
    console.log(filtrar["options"]["foros_usados"])
    //filtrar["foros_usados"] = foros_usados
    save_options()
  })

  function add_button_foro(id){
    var boton_html = '<div class="col-lg-12"> \
    <a id="' + id + '" class="btn btn-raised btn-block btn-primary btn-foro">' + foros[id] + '<span class="close">x</span> </a>\
    </div> \ '
    $('#boton_end').before(boton_html)
  }

  $(document).on('click', '.btn-foro',  function(e){
    id = $(this).attr('id')
    console.log(id)

    $('.btn-foro').removeClass('active').addClass('inactive');
    $(this).removeClass('inactive').addClass('active');
    if (tags_words == false){
      $('#mostrar').trigger('click')
    }
    if (tags_users == false){
      $('#mostrar2').trigger('click')
    }
    $('#lista').materialtags('removeAll');
    $('#lista2').materialtags('removeAll');
    get_db(id)

  })

  $(document).on('click', '.close',  function(e){
    id = $(this).closest('a').attr('id');
    pos = $.inArray(id, filtrar["options"]["foros_usados"])
    if (pos != -1){
      filtrar["options"]["foros_usados"].splice(pos, 1 );
      boton = $(this).closest("div").remove()
    }
    //filtrar["foros_usados"] = foros_usados
    save_options()
    console.log(filtrar["options"]["foros_usados"])
  })

  /*********************Fin seleccionar foros*********************/

  /*********************Mostrar etiquetas o texto plano*********************/
  var tags_words = true
  $('#mostrar').on('click', function(e){
    if(tags_words){
      mostrar_texto($("#lista"))
      tags_words = false
      $('#mostrar').text("Mostrar etiquetas")
    }
    else{
      mostrar_tags($("#lista"))
      tags_words = true
      $("#lista").materialtags();
      $('#mostrar').text("Mostrar texto plano")
    }
  })

  var tags_users = true
  $('#mostrar2').on('click', function(e){
    if(tags_users){
      mostrar_texto($("#lista2"))
      tags_users = false
      $('#mostrar2').text("Mostrar etiquetas")
    }
    else{
      mostrar_tags($("#lista2"))
      tags_users = true
      $("#lista2").materialtags();
      $('#mostrar2').text("Mostrar texto plano")
    }
  })

  function mostrar_texto(element){
    element.materialtags("destroy");
    var $txtarea = $("<textarea />");
    $txtarea.attr("id", element.attr('id'));
    $txtarea.attr("class", element.attr('class') + " form-control");
    $txtarea.attr("rows", 6);
    $txtarea.val(element.val());
    element.replaceWith($txtarea);
  }

  function mostrar_tags(element){
    var $txtarea = $('<input type="text" />');
    $txtarea.attr("id", element.attr('id'));
    console.log(element.attr('id'))
    $txtarea.attr("class", element.attr('class'));
    $txtarea.attr("rows", 6);
    $txtarea.val(element.val());
    element.replaceWith($txtarea);
  }
  /*********************Fin mostrar etiquetas o texto plano*********************/


  $('form').on('submit', function(e) {
    e.preventDefault();
    var foro = $('#sel_foro .active').attr('id')
    console.log(foro)
    form = $(this).attr('id')
    button = $("button",this)
    //DEPRECATED: Borrar codigo, util cuando utilizabamos textarea en vez de materialtags
    // textarea = $("textarea", this)
    mtags = $("."+form, this)
    string_palabras = mtags.val().toLowerCase().replace(/( *, *,*)/g, ",").trim()
    // console.log(string_palabras)
    string_palabras = escapeRegExp(string_palabras)
    // console.log(string_palabras)
    string_palabras = string_palabras.split("\,")
    if (string_palabras[string_palabras.length-1] == ""){
      string_palabras.splice(string_palabras.length-1, 1 );
    }
    // console.log(string_palabras)
    var datatosync = {}
    datatosync["filtrar"] = filtrar
    // datatosync["filtrar"][foro] = {}
    // datatosync["filtrar"][foro]["ocultar"] = {}
    datatosync["filtrar"][foro]["ocultar"][form] = string_palabras
    console.log(datatosync)
    chrome.storage.sync.set(datatosync, function() {
      // Notify that we saved.
      console.log("Guardado correctamente")
      button.addClass("btn-success btn-raised")
      setTimeout(function(){
        button.removeClass("btn-success btn-raised")
      }, 1000);
    });
  });

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
    // $('#oscurecer').change(function() {
    //   console.log("oscurecer")
    //   if ($(this).prop('checked')){
    //     //$('#ocultar').bootstrapToggle('off')
    //     options["oscurecer"] = true
    //   }
    //   else{
    //     options["oscurecer"] = false
    //   }
    //   save_options()
    // })
  })

  function save_options(){
    console.log("guardando opciones")
    var datatosync = {}
    console.log(options)
    datatosync["options"] = options
    datatosync["filtrar"] = filtrar
    console.log(datatosync)
    chrome.storage.sync.set(datatosync, function() {

      // Notify that we saved.
      console.log("Guardado correctamente")
    });

  }

});

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&');
}

$(function() {
  $("#ejemplo1").on('click', function(e) {
    $(".modal-title").text("Como ocultar hilos por palabras clave")
    $(".modal-body").html("<pre>PENYA CULER, PEÑA MERENGUE,SUPERVIVIENTES 2017, pp, podemos, psoe</pre>")
    // $(".modal-body").html("<pre>PENYA CULER, PEÑA MERENGUE,SUPERVIVIENTES 2017, pp, podemos, psoe</pre> \
    // Nota:<br>Por ejemplo, si el titulo es:<pre> SUPERVIVIENTES 2017 VOL:VI Indiana Jones y los Kilos perdidos de Gloria +18 +hd</pre> \
    // y queremos ocultar este volumen y los siguientes es importante escoger adecuadamente las palabras a bloquear \
    // Por ejemplo si cogemos: \
    // <pre>SUPERVIVIENTES 2017 VOL:</pre> \
    // No funcionara adecuadamente ya que el script busca por palabras completas y VOL: está cortada")
  })})

  $(function() {
    $("#ejemplo2").on('click', function(e) {
      $(".modal-title").text("Como ocultar hilos por usuarios")
      $(".modal-body").html("<pre>yerro, ^Megara^, mc osborne, Trueno Yw</pre>")
    })})
