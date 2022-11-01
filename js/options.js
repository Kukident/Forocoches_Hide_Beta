$(document).ready(function() {
  $.material.init();
  get_db("2", true)
  var filtrar = []


  function get_db(foro, options2=false){
    customStorage.sync.get(null, function(data) {
      console.log(data)
      var banwords = []
      var banusers = []

      var result = get_filtrar(data,foro)
      banwords = result["banwords"]
      banusers = result["banusers"]

      filtrar = parse_data(data, foro)
      $('#ocultar').attr('checked', filtrar["options"]["active"])

      if (options2){
        filtrar["options"]["foros_usados"].forEach(function(id){
          if (id !== "2"){
            add_button_foro(id)
          }
        })
      }
      $("#lista").materialtags("add",banwords.join(", ").replace(/[\\]/g,''))
      $("#lista2").materialtags("add",banusers.join(", ").replace(/[\\]/g,''))

      $("#contador_palabras").text(banwords.length)
      $("#contador_usuarios").text(banusers.length)
    });
  }

  $('#borrar').on('click', function(e){
    customStorage.sync.clear();
    console.log("Borrar BD")
  })

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
    //console.log(filtrar["options"]["foros_usados"])
    save_options()
    $("#"+id).click()
  })

  function add_button_foro(id){
    var boton_html = '<div class="col-lg-12"> \
    <a id="' + id + '" class="btn btn-raised btn-block btn-primary btn-foro">' + foros[id][0] + '<span class="close">x</span> </a>\
    </div> \ '
    $('#boton_end').before(boton_html)
  }

  $(document).on('click', '.btn-foro',  function(e){
    id = $(this).attr('id')

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
    // Cancelamos la propagacion del evento, para que no se extienda a la funcion superior.
    if (!e) var e = window.event;
    e.cancelBubble = true;
    if (e.stopPropagation) e.stopPropagation();

    id = $(this).closest('a').attr('id');
    pos = $.inArray(id, filtrar["options"]["foros_usados"])
    if (pos != -1){
      filtrar["options"]["foros_usados"].splice(pos, 1 );
      boton = $(this).closest("div").remove()
    }
    save_options()
    $('#2').trigger('click')
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
    string_palabras = escapeRegExp(string_palabras)
    string_palabras = string_palabras.split("\,")
    if (string_palabras[string_palabras.length-1] == ""){
      string_palabras.splice(string_palabras.length-1, 1 );
    }

    var datatosync = {}
    datatosync["filtrar"] = filtrar
    save_words(datatosync, string_palabras, foro, form)

    if (form === 'banwords') {
      $("#contador_palabras").text(string_palabras.length)
    }
    else if (form === 'banusers'){
      $("#contador_usuarios").text(string_palabras.length)
    }
  });

  $(function() {
    $('#ocultar').change(function() {
      if ($(this).prop('checked')){
        filtrar["options"]["active"] = true
      }
      else{
        filtrar["options"]["active"] = false
      }
      save_options()
    })
  })

  function save_options(){
    var datatosync = {}
    datatosync["filtrar"] = filtrar
    customStorage.sync.set(datatosync, function() {
      // Notify that we saved.
      console.log("Guardado correctamente")
    });

  }

});

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
