
function GridIsotope(grid) {
	this._grid = grid;
	this._baseItems = 10;
	this._classLarge = 'grid-item--width2';
	this.filter = '*';
	this.listing = '';
	this.iso = '';
	var t = this;
	var once = false;
	
	// Initialise Isotope	
	this.iso = new Isotope(this._grid, {
		itemSelector: '.grid-item',
		percentPosition: true,
        masonry: { columnWidth: '.grid-sizer' }
	});
	
	this.iso.on( 'layoutComplete', function() {
		// Ajuste la hauteur des tuiles
		t.heightAdjust();
	});
	
	this.iso.once( 'arrangeComplete', function() {
		// On affiche la grille uniquement après son initialisation en JS
		if (!t._grid.classList.contains('grid-initialized')) t._grid.classList.add('grid-initialized');
	});

	// Ajuste la hauteur des items
	this.heightAdjust();
		
	// Active la mise à jour des hauteurs au resize de la fenêtre
    window.addEventListener('resize', function(){ t.heightAdjust() });
	
	// Recupère le mode de listing dans le menu
	var activeFilters = document.querySelectorAll(".breadcrumb-real-index ul .active");
	if (activeFilters.length) {
		this.listing = activeFilters[0].dataset.mode;
	}
	
	// Initialise les filtres
	this.initializeFilters('.grid-filters');
	
	// A cause de la largeur d'écran adaptative, on s'assure que la grille est ajusté 1/3 de seconde après le chargmeent
	window.setTimeout(function(){ t.update() }, 300);
	
};

GridIsotope.prototype = {
	
	// Initialise l'interface de filtrage
	initializeFilters: function (filtersSelector) {
		
		// Récupère une potentielle valeur de filtre initiale
		this.filter = document.querySelector(filtersSelector + " .active a").dataset.filter || '*';
		
		var t = this;
			
		var filters = document.querySelectorAll(filtersSelector + ' a');

		for (var i = 0; i < filters.length; i++) {
			filters[i].addEventListener("click", function (event) {

				// Annule le lien, sauf si class 'true-link'
				if (!event.target.parentNode.classList.contains('true-link')) event.preventDefault();

				// Affiche le lien voir plus 
				// $(".grid-more").show();
				document.querySelector('.grid-more').style.display = 'inline-block';
				
				// Change l'URL de la page courante avec l'URL filtrée
				if (event.target.href) changeUrl('', event.target.href);
			
				// Décoche les filtres selectionnés
				var filtersActive = document.querySelectorAll('.grid-filters li.active');
				for (var i = 0; i < filtersActive.length; i++) {
					filtersActive[i].classList.remove("active");
				}
				
				// Coche le filtre sélectionné
				event.target.parentNode.classList.add('active');
				
				// Réinitialise sinon bug au passage d'un filtre à un autre
				t.iso.arrange({
					filter: '*',
					masonry: { columnWidth: '.grid-sizer' }
				});
				
				// Applique le filtre selectionné
				t.iso.arrange({
					filter: event.target.dataset.filter + ", .grid-item-link", // Permet de garder les tuiles de lien par defaut dans l'affichage
					masonry: { columnWidth: '.grid-sizer' }
				});
				
				// Récupère la valeur du filtre (sans le '.' de class CSS)
				t.filter = event.target.dataset.filter.replace('.','');
				
				// Compte le nb d'éléments affichés
				var nbItems = t.iso.getFilteredItemElements().length;
				
				// Si un filtre est activé et que l'on a moins d'items que le minimum initiale, on en charge le nombre manquant.
				if (t.filter != '*' && nbItems < t._baseItems) {
					t._addItems(t.filter);
				}
				
				// Applique le filtre aux URL des items
				t.filterApplyToURL();
				
				// Récupère les données du filtre selectionné pour les liens de la grille
				var linkParams = {
					code:	event.target.dataset.code,
					titre:	event.target.dataset.btnTitre,
					texte:	event.target.dataset.btnTexte,
					action:	event.target.dataset.btnAction,
					url:	event.target.dataset.btnUrl
				}
				
				if (linkParams.code) t.changeLinks(linkParams);
			});
		}
	},

	// Applique le filtre courant à tous les liens des items
	filterApplyToURL: function () {
		
		var params = new Array();

		// Ajoute le mode de listing
		if (this.listing != '' && this.listing != 'secteur') params.push("l=" + this.listing);

		// Ajoute le filtre
		if (this.filter != '*') params.push("s=" + this.filter.replace(/^[\s\.\xA0]+|$/g, ''));
		
		// Change l'URL sur tous les liens
		var gridItemLinks = document.querySelectorAll('.grid-item');
		for (var i = 0; i < gridItemLinks.length; i++) {
			if (gridItemLinks[i].classList.contains('grid-item-link')) continue;
			
			url = gridItemLinks[i].dataset.url;
			if (params.length) url += "?" + params.join("&");
			var itemLinks = gridItemLinks[i].querySelectorAll('a');
			for (var j = 0; j < itemLinks.length; j++) {
				itemLinks[j].href = url;
			}
		}
	},

	// Permet d'ajouter des éléments, éventuellement d'une catégorie
	_addItems: function (filter) {
		
		var t = this;
		
		if (filter == '*') filter = '';
        
        var params = new FormData();
        params.append('action', 'grid_projects_get');
        params.append('l',      t.listing);
        params.append('t',      filter);
        params.append('e',      this.getIdsList());
        
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'scripts/projects-datas.json', true);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    try {
                        ret = JSON.parse(xhr.responseText);
                        if(ret.status == "success") {
                            if (ret.datas instanceof Array) {
                                
                                for (var i = 0; i < ret.datas.length; i++) {
                                    // Récpère l'élément créé à partir des données reçues
                                    e = t.createItemElement(ret.datas[i]);
                                    
                                    // Ajoute l'item au DOM puis le déclare à isotope
                                    t._grid.appendChild(e);
                                    t.iso.appended(e);
                                }
            
                                // Ajuste la hauteur des items
                                t.heightAdjust();
                                
                                // Met à jour l'affichage
                                t.update();
                                
                                // Applique le filtre aux URL des items
                                t.filterApplyToURL();
                                
                            }
                            else {
                                // Masque le lien voir plus car pas de résultat
                                document.querySelector(".grid-more").style.display = 'none';
                            }
                        }
                        else { console.log(ret.error) }
                    }
                    catch(e) { console.log("Une erreur s\'est produite", e) }
                }
                else {
                    console.log("Erreur ajax");
                }
            }
        }
        
        xhr.send(params);
	},

	// Ajoute des éléments (action du voir plus)
	more: function () {
		this._addItems(this.filter);
	},

	// Actualise l'ajustement de la hauteur des éléments
	heightAdjust: function () {
		w = document.querySelector(".grid-sizer").offsetWidth;
		
		var items = document.querySelectorAll(".grid-item");
		
		p = parseInt(items[0].style.paddingLeft) * 2 || 0;
		for(var i = 0; i < items.length; i++) {
			items[i].style.height = parseInt(w - p) + 'px';
		}
		var itemsW2 = document.querySelectorAll(".grid-item--width2");
		for(var i = 0; i < itemsW2.length; i++) {
			itemsW2[i].style.height = parseInt(w*2 - p) + 'px';
		}
	},

	// Met à jour l'affichage de la grille
	update: function () {
		this.iso.layout();
	},
    
    // Créé l'élément du DOM d'un item de la grille
    createItemElement: function (datas) {
        
        var elem = document.createElement("div");
        
        var c = datas.classList.split(" ");
        for (var i=0; i<c.length; i++) {
            elem.classList.add(c[i]);
        }
        elem.dataset.id = datas.id;
        
        var d1 = document.createElement("div");
        d1.classList.add("item-content");
        elem.appendChild(d1);
        
        var p = document.createElement("picture");
        d1.appendChild(p);
        
        var s = document.createElement("source");
        s.media = "(max-width: 480px)";
        s.srcset = datas.imgXS;
        p.appendChild(s);
        
        var i = document.createElement("img");
        i.src = datas.imgMD;
        i.alt = datas.title;
        p.appendChild(i);
        
        var d2 = document.createElement("div");
        d2.classList.add("text-hover");
        d1.appendChild(d2);
        
        var a1 = document.createElement("a");
        a1.href = datas.url;
        a1.classList.add("link-global");
        d2.appendChild(a1);
        
        var a2 = document.createElement("a");
        a2.href = datas.url;
        a2.classList.add("name");
        a2.textContent = datas.title;
        d2.appendChild(a2);
        
        var p2 = document.createElement("p");
        p2.textContent = datas.text;
        d2.appendChild(p2);
        
        var a3 = document.createElement("a");
        a3.href = datas.url;
        a3.classList.add("btn");
        a3.classList.add("btn-default");
        a3.textContent = "Voir";
        d2.appendChild(a3);

        return elem;
    },

	// Retourne la liste des ids des items affichés
	getIdsList: function () {
		
		var idsList = new Array();
		
		var gridItems = document.querySelectorAll('.grid-item');
		
		for(var i = 0; i < gridItems.length; i++) {
			if (gridItems[i].dataset.id) idsList.push(gridItems[i].dataset.id);
		}
		
		return idsList;
	},

	// Change le style, textes et URL des tuiles de liens
	changeLinks: function (linkParams) {
		
		if (!linkParams.code) return;
		
		var t = this,
			linkParams = linkParams;
		
		var gridItemLinks = document.querySelectorAll(".grid-item-link");
		for (var i = 0; i < gridItemLinks.length; i++) {
			gridItemLinks[i].dataset.code = "default";	// On ne passe plus le theme, tout theme par defaut
			gridItemLinks[i].querySelect(".name").textContent = linkParams.titre;
			gridItemLinks[i].querySelect(".text-b .btn").textContent = linkParams.action;
			gridItemLinks[i].querySelect(".text-b .btn").href = linkParams.url;
			gridItemLinks[i].querySelect(".text > p").textContent = linkParams.url;
		}
	}
	
};

var grid;
document.addEventListener('DOMContentLoaded', function () {
	// Initialise la grille des réalisations
	var g = document.querySelector(".grid");
	if (g) grid = new GridIsotope(g);
});


/** Change l'URL sans rediriger
  */
function changeUrl(title, url) {
	if (!title) title = document.title;
	if (typeof (history.pushState) != "undefined") {
		var obj = { Title: title, Url: url };
		history.pushState(obj, obj.Title, obj.Url);
	} else {
		alert("Browser does not support HTML5.");
	}
}
