// $("#threadbits_forum_2").children().each(function(){
// console.log("huehuehue")
// console.log($(this).children() > $("[id^=thread_title_]"))
// });

$("#collapseobj_st_2").before('<tbody id="collapseobj_st_3"> \
</tbody> \
')

var hilos_ocultados = 0;
chrome.storage.sync.get(['banwords', 'banusers','options'], function(data) {
  //console.log(data)
  palabras = data["banwords"]
  users = data["banusers"]
  options = data["options"]
  if (options["ocultar"] == true || options["oscurecer"] == true){
    // var expreg = new RegExp("\\b("+palabras.join(")\\b|\\b(")+")\\b")
    // (?:\s|^)(cadena a comprobar)(?=\s|$)
    var expreg = new RegExp("(?:\\s|^)("+palabras.join(")(?=\\s|$)|(?:\\s|^)(")+")(?=\\s|$)")
    var expreg_users = new RegExp("(?:\\s|^)("+users.join(")(?=\\s|$)|(?:\\s|^)(")+")(?=\\s|$)")
    $("[id^=thread_title_]").each(function(){
      // console.log($(this).text())
      var texto = $(this).text().trim().toLowerCase()
      //console.log($(this).parent().next().text().trim())
      var user = $(this).parent().next().text().trim().toLowerCase()
      // console.log(palabras)
      // console.log(expreg)
      if (texto.match(expreg) != null || user.match(expreg_users)){
        if (options["ocultar"] == true){
          $(this).closest("tr").hide()
        }
        else if (options["oscurecer"] == true){
          $(this).closest("tr").css("opacity" ,0.2)
        }
        $("#collapseobj_st_3").append($(this).closest("tr"))
        hilos_ocultados++
        // console.log(hilos_ocultados)
      }
    });
    $(".cmega2").append("<br><span class='smallfont'>Se han ocultado "+hilos_ocultados+" hilos</span>")


    $("#stickies_collapse").before('<td class="vbmenu_control" id="hide_collapse" nowrap="nowrap"> \
    <a href=""> \
    Hilos Ocultos \
    <img id="collapseimg_st_3" src="//st.forocoches.com/foro/images/buttons/collapse_tcat_collapsed.gif" alt="" border="0" hspace="3"> \
    </a> \
    </td>')
    $("#collapseobj_st_3").hide()
    $("#collapseobj_st_3").append('<tr><td class="thead" colspan="6">&nbsp;</td></tr>')

    $("#hide_collapse").on('click', function(e) {
      e.preventDefault();
      if ($("#collapseobj_st_3").is(":visible")){
        $("#collapseimg_st_3").replaceWith('<img id="collapseimg_st_3" src="//st.forocoches.com/foro/images/buttons/collapse_tcat_collapsed.gif" alt="" border="0" hspace="3">')
        $("#collapseobj_st_3").hide()
      }
      else {
        $("#collapseimg_st_3").replaceWith('<img id="collapseimg_st_3" src="//st.forocoches.com/foro/images/buttons/collapse_tcat.gif" alt="" border="0" hspace="3">')
        $("#collapseobj_st_3").show()
      }
    });




  }
});
