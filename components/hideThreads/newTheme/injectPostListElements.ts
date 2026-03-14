export function manageNewThemeHtml() {
    let button = injectButton();
    injectTable(button);


    // Add event listener to toggle visibility
    const hideCollapse = document.getElementById("hide_collapse");
    if (!hideCollapse) return;
    hideCollapse.addEventListener('click', (e) => {
        e.preventDefault();
        const hilosOcultos = document.getElementById("hilos_ocultos");
        const flechaIcon = document.getElementById("flecha_icon");
        if (hilosOcultos && flechaIcon) {
            if (hilosOcultos.style.display === 'none') {
                flechaIcon.style.transform = 'rotate(270deg)';
                hilosOcultos.style.display = 'block';
            } else {
                flechaIcon.style.transform = 'rotate(90deg)';
                hilosOcultos.style.display = 'none';
            }
        }
    });
}

function injectButton(): string {
    const sectionMenu = `
    <div style="cursor: pointer; user-select: none; display: flex; flex-direction: row; align-items: center; background-color: var(--forum-title-background); margin-right: 10px; margin-left: 10px; margin-bottom: 2px">
      <h1 id="hide_collapse" class="black-ribbon-title" style="padding-left: 46px; padding-right: 0px; margin-right: 0px; margin-left: 0px; flex: 1">
        Hilos Ocultos <span id="contador_hilos" style="font-size: 0.85em; opacity: 0.7"></span>
        <span id="flecha_icon" style="background-image: var(--next-right-icon); height: 12px; width: 12px; margin-left: 4px; transform: rotate(90deg); float: right; margin-right: 23px; height: 20px; width: 20px;" class="single-icon-image"></span>
      </h1>
    </div>`;

    return sectionMenu;
}

function injectTable(sectionMenu: string): void {
    const sortingMenu = document.getElementById("sorting_menu");
    if (sortingMenu) {
        sortingMenu.insertAdjacentHTML('afterend', '<section id="hilos_ocultos" class="without-top-corners without-bottom-corners" style="padding: 0; display: none"></section>');
        sortingMenu.insertAdjacentHTML('afterend', sectionMenu);
    }
}