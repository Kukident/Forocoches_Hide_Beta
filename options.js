$(document).ready(function() {
  $.material.init();
  get_db("2", true)
  var filtrar = []


  function get_db(foro, options2=false){
    chrome.storage.sync.get(null, function(data) {
      console.log(data)
      var banwords = []
      var banusers = []

      var result = get_filtrar(data,foro)
      banwords = result["banwords"]
      banusers = result["banusers"]
      //
      // keys = Object.keys(data)
      // keys.forEach((key) => {
      //   console.log(key)
      //   if (key.includes("f_" + foro + "_" + "banwords_")){
      //     banwords = banwords.concat(data[key].slice())
      //   }
      //   if (key.includes("f_" + foro + "_" + "banusers_")){
      //     banusers = banusers.concat(data[key].slice())
      //   }
      // })
      // banwords.sort()
      // banusers.sort()

      filtrar = parse_data(data, foro)
      // // console.log(filtrar)
      // banwords = filtrar[foro]["ocultar"]["banwords"]
      // banusers = filtrar[foro]["ocultar"]["banusers"]
      $('#ocultar').attr('checked', filtrar["options"]["active"])

      //DEPRECATED: Borrar codigo, util cuando utilizabamos textarea en vez de materialtags
      //$("#lista").val(banwords.join(", ").replace(/[\\]/g,''));
      // $("#lista2").val(banusers.join(", ").replace(/[\\]/g,''));

      if (options2){
        filtrar["options"]["foros_usados"].forEach(function(id){
          if (id !== "2"){
            add_button_foro(id)
          }
        })
      }
      $("#lista").materialtags("add",banwords.join(", ").replace(/[\\]/g,''))
      $("#lista2").materialtags("add",banusers.join(", ").replace(/[\\]/g,''))
    });
  }

  $('#borrar').on('click', function(e){
    chrome.storage.sync.clear();
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
    <a id="' + id + '" class="btn btn-raised btn-block btn-primary btn-foro">' + foros[id] + '<span class="close">x</span> </a>\
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
    //datatosync["filtrar"][foro]["ocultar"][form] = string_palabras
    // console.log("Guardamos estos datos en la BD")
    // console.log(datatosync)


    // console.log(lengthInUtf8Bytes( JSON.stringify(filtrar)))
    // // console.log(string_palabras)
    // let a = {form: string_palabras}
    // console.log(lengthInUtf8Bytes( JSON.stringify(a)))
    // //let hue = {}
    // let i = 1
    // let b = []
    // let d = []
    // // while (lengthInUtf8Bytes(JSON.stringify(a)) > 8000){
    // //   console.log("huehuehue")
    // // }
    // console.log(string_palabras.length)
    // while (lengthInUtf8Bytes(JSON.stringify(a)) >= 8000){
    //   console.log("dentro whil")
    //   let popped = string_palabras.pop()
    //   b.unshift(popped)
    //   let a2 = {form: b}
    //   if (lengthInUtf8Bytes(JSON.stringify(a2)) >= 8000){
    //     d = []
    //     while(lengthInUtf8Bytes(JSON.stringify(a2)) >= 8000){
    //       let c = b.pop()
    //       d.unshift(c)
    //       a2 = {form: b}
    //     }
    //     let name = "f_" + foro + "_" + form + "_" + i
    //     let name1 = "f_" + foro + "_" + form + "_" + (i+1)
    //     datatosync[name] = b.slice()
    //     datatosync[name1] = d.slice()
    //     b = []
    //     i += 1
    //
    //     // let c = b.pop()
    //     // let name = "f_" + foro + "_" + form + "_" + i
    //     // hue[name] = b.slice()
    //     // b = []
    //     // b.unshift(c)
    //     // i += 1
    //     //hue[name] = b.slice()
    //     //console.log(hue)
    //   }
    // }
    // let name0 = "f_" + foro + "_" + form + "_" + "0"
    // let namen = "f_" + foro + "_" + form + "_" + i
    // datatosync[name0] = string_palabras
    // console.log(i)
    // console.log(name0)
    // console.log(namen)
    // if (b.length !== 0 && datatosync[namen]){
    //   datatosync[namen] = datatosync[namen].concat(b)
    // }
    // if (d.length !== 0 && datatosync[namen]){
    //   datatosync[namen] = datatosync[namen].concat(d)
    // }
    // console.log(datatosync)

    save_words(datatosync, string_palabras, foro, form)
    // chrome.storage.sync.set(datatosync, function() {
    //   // Notify that we saved.
    //   let btn_class = ""
    //   if(chrome.runtime.lastError){
    //     console.log(chrome.runtime.lastError.message)
    //     btn_class = "btn-danger"
    //   }
    //   else{
    //     console.log("Guardado correctamente")
    //     btn_class = "btn-success"
    //     chrome.storage.sync.get(null, function(data) {
    //       keys = Object.keys(data)
    //       keys_to_remove = []
    //       keys.forEach((key) => {
    //         console.log(key)
    //         if (key.includes("f_" + foro + "_" + form + "_") && !datatosync[key]){
    //           keys_to_remove.push(key)
    //         }
    //       })
    //       chrome.storage.sync.remove(keys_to_remove)
    //     });
    //   }
    //   button.addClass(btn_class + " btn-raised")
    //   setTimeout(function(){
    //     button.removeClass(btn_class + " btn-raised")
    //   }, 1000);
    // });

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
    chrome.storage.sync.set(datatosync, function() {
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
