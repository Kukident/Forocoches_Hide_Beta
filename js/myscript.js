var palabras = []
var users = []
var ocultar = false
var hilos_ocultados = 0;
var id_foro = GetURLParameter(window.location, 'f');
var temaForo = 'old';

// Detectamos tema foro
if ($("#fc-desktop-version-tag-for-monitoring").length > 0) {
  temaForo = 'new';
  manageNewThemeHtml();
} else {
  manageOldThemeHtml();
}

customStorage.sync.get(null, function(data) {
  filtrar = parse_data(data, id_foro)
  result = get_filtrar(data, id_foro)
  palabras = result["banwords"]
  users = result["banusers"]
  ocultar = filtrar["options"]["active"]

  if (ocultar === true && $.inArray(id_foro, filtrar["options"]["foros_usados"]) !== -1){
    // var expreg = new RegExp("\\b("+palabras.join(")\\b|\\b(")+")\\b")
    // (?:\s|^)(cadena a comprobar)(?=\s|$)

    // Creamos las variables con una expresion regular por defecto, ya que si no a veces ocultaba hilos debido a espacios ocultos
    var expreg = new RegExp("^((?!()).)*$")
    var expreg_users = new RegExp("^((?!()).)*$")
    if (palabras.length !== 0){
      expreg = new RegExp("(?:\\s|^)("+palabras.join(")(?=\\s|$)|(?:\\s|^)(")+")(?=\\s|$)")
    }
    if (users.length !== 0){
      expreg_users = new RegExp("(?:\\s|^)("+users.join(")(?=\\s|$)|(?:\\s|^)(")+")(?=\\s|$)")
    }

    if (temaForo === 'old') {
      hideOldThemeThreads(ocultar, expreg, expreg_users);
    } else {
      hideNewThemeThreads(ocultar, expreg, expreg_users);
    }
  }
});

function hideOldThemeThreads(ocultar, expreg, expreg_users){
  $("[id^=thread_title_]").each(function(){
    var texto = $(this).text().trim().toLowerCase()
    var user = $(this).parent().next().text().trim().toLowerCase()
    // console.log(texto)

    if (texto.match(expreg) != null || user.match(expreg_users) != null){
      if (ocultar === true){
        $(this).closest("tr").css("opacity" ,0.2)
      }

      $("#collapseobj_st_3").append($(this).closest("tr"))
      hilos_ocultados++
    }
  });
  $("#collapseobj_st_3").append('<tr><td class="thead" colspan="6">&nbsp;</td></tr>')
  $(".cmega2").append("<br><span class='smallfont'>Se han ocultado "+hilos_ocultados+" hilos</span>")

  // TODO Añade el numero de hilos al icono de la extension
  // chrome.runtime.sendMessage({hilos: hilos_ocultados.toString()}, function(response) {
  //   console.log(response);
  // });
}

function manageOldThemeHtml() {
//////////////////////Inicio crear interfaz\\\\\\\\\\\\\\\\\\\\\\\\\\\\º
  $("#threadslist").children().first().after('<tbody id="collapseobj_st_3"></tbody>')
//TODO: Optimizar codigo
//console.log($("#stickies_collapse"))
  if ($("#stickies_collapse").length) {
    $("#stickies_collapse").before('<td class="vbmenu_control" id="hide_collapse" nowrap="nowrap"> \
  <a href=""> \
  Hilos Ocultos \
  <img id="collapseimg_st_3" src="/foro/images/misc/menu_open.gif" alt="" border="0" hspace="3"> \
  </a> \
  </td>')
  } else {
    $("#forumtools").before('<td class="vbmenu_control" id="hide_collapse" nowrap="nowrap"> \
  <a href=""> \
  Hilos Ocultos \
  <img id="collapseimg_st_3" src="/foro/images/misc/menu_open.gif" alt="" border="0" hspace="3"> \
  </a> \
  </td>')
  }
  $("#collapseobj_st_3").hide()
// $("#collapseobj_st_3").append('<tr><td class="thead" colspan="6">&nbsp;</td></tr>')

  $("#hide_collapse").on('click', function (e) {
    e.preventDefault();
    if ($("#collapseobj_st_3").is(":visible")) {
      $("#collapseimg_st_3").replaceWith('<img id="collapseimg_st_3" src="/foro/images/misc/menu_open.gif" alt="" border="0" hspace="3">')
      $("#collapseobj_st_3").hide()
    } else {
      $("#collapseimg_st_3").replaceWith('<img id="collapseimg_st_3" src="/foro/images/misc/menu_open.gif" alt="" border="0" hspace="3" style="transform: rotate(180deg);">')
      $("#collapseobj_st_3").show()
    }
  });
//////////////////////Fin crear interfaz\\\\\\\\\\\\\\\\\\\\\\\\\\\\
}

function hideNewThemeThreads(ocultar, expreg, expreg_users) {
  console.log('ocultamos nuevos hillos')
  $("[id^=thread_title_]").each(function(){
    var texto = $(this).text().trim().toLowerCase()
    var user = $(this).parent().next().text().trim().toLowerCase() //Revisar esto
    //console.log(texto)

    if (texto.match(expreg) != null || user.match(expreg_users) != null){
      if (ocultar === true) {
        let threadElement = $(this).closest("div").parent('div').parent('div');
        let threadElementSeparator = threadElement.next('separator');
        threadElement.css("opacity", 0.2)
        $("#hilos_ocultos").append(threadElement)
        $("#hilos_ocultos").append(threadElementSeparator)
        hilos_ocultados++
      }
    }
  });
  $("#hilos_ocultos").append()
  $("#hide_collapse").append("<span class='smallfont'>- "+hilos_ocultados+"</span>")
}

function manageNewThemeHtml() {
  let sectionMenu = '<div style="cursor: pointer; user-select: none; display: flex; flex-direction: row; align-items: center; background-color: var(--forum-title-background); margin-right: 10px; margin-left: 10px; margin-bottom: 2px"> \
    <h1 id="hide_collapse" class="black-ribbon-title" style="padding-left: 46px; padding-right: 0px; margin-right: 0px; margin-left: 0px; flex: 1">\
        Hilos Ocultos \
        <span id="flecha_icon" style="background-image: var(--next-right-icon);height: 12px; width: 12px; margin-left: 4px; transform: rotate(90deg); float: right; margin-right: 23px; height: 20px; width: 20px;" class="single-icon-image"></span>\
        </h1> \
  </div>';

  $("#sorting_menu").next().before('<section id="hilos_ocultos" class="without-top-corners without-bottom-corners" style="padding: 0; display: none">');
  $("#sorting_menu").next().before(sectionMenu);

  $("#hide_collapse").on('click', function (e) {
    e.preventDefault();
    if ($("#hilos_ocultos").is(":visible")) {
      $("#flecha_icon").css("transform", "rotate(90deg)")
      $("#hilos_ocultos").hide()
    } else {
      $("#flecha_icon").css("transform", "rotate(270deg)")
      $("#hilos_ocultos").show()
    }
  });
}