export function manageOldThemeHtml() {
    const button = injectButton();
    injectTable();

    button.addEventListener('click', (e) => {
        e.preventDefault();
        const collapseObj = document.getElementById('collapseobj_st_3');
        const collapseImg = document.getElementById('collapseimg_st_3');
        if (collapseObj && collapseImg) {
            if (collapseObj.style.display === 'none') {
                collapseObj.style.display = '';
                collapseImg.style.transform = 'rotate(180deg)';
            } else {
                collapseObj.style.display = 'none';
                collapseImg.style.transform = '';
            }
        }
    });
}

function injectButton(): HTMLElement {
    const newTd = document.createElement('td');
    newTd.className = 'vbmenu_control';
    newTd.id = 'hide_collapse';
    newTd.setAttribute('nowrap', 'nowrap');
    newTd.innerHTML = '<a href="">Hilos Ocultos <span id="contador_hilos"></span><img id="collapseimg_st_3" src="/foro/images/misc/menu_open.gif" alt="" border="0" hspace="3"></a>';

    const forumTools = document.getElementById('forumtools');
    if (forumTools) {
        forumTools.parentNode?.insertBefore(newTd, forumTools);
    }

    return newTd;
}

function injectTable() {
    const threadsList = document.getElementById('threadslist');
    if (threadsList && threadsList.children.length > 0) {
        const newTbody = document.createElement('tbody');
        newTbody.id = 'collapseobj_st_3';
        threadsList.insertBefore(newTbody, threadsList.children[1]);
        newTbody.style.display = 'none';
    }
}
