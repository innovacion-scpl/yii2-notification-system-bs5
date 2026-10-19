var Notifications = (function(options) {
	
	const SECCION_NOTIF = 1;
	const SECCION_ALERTAS = 2;

	this.currentNotifications = [];
	this.notificacionesTotales = [];
	this.currentTimer = null;
	this.totalNoLeidas = 0;
	this.seccion_activa = SECCION_NOTIF;
	
//		function notify(){ //This syntax makes the function callable only from within the class.
	this.notify = function(notification){ //This syntax makes the function callable by the object (this)
		toastr.options.closeButton = true;
		toastr.options.timeOut = this.opts.delay; // How long the toast will display without user interaction
		toastr.options.extendedTimeOut = this.opts.delay; // How long the toast will display after a user hovers over it
		toastr.options.tapToDismiss = false;
		
		var body = notification.body + notification.footer;
		
		//Mark as flashed since we're showing the notification with toastr.
		flash(notification);
		
		// Define a callback for when the toast is shown/hidden/clicked
//    		toastr.options.onShown = function() {
//    			console.log('hello');
//    		}
//    		toastr.options.onHidden = function() {
//    			console.log('goodbye');
//    		}
    		toastr.options.onclick = function(e) { 
//    			console.log('clicked');
    			goToRoute(notification.id);
    		}
//    		toastr.options.onCloseClick = function() { 
//    			console.log('close button clicked');
//    		}
		
		if(notification.type == 'default'){
			toastr.info(body, notification.title);
		}else if(notification.type == 'success'){
			toastr.success(body, notification.title);
		}else if(notification.type == 'warning'){
			toastr.warning(body, notification.title);
		}else if(notification.type == 'error'){
			toastr.error(body, notification.title);
		}else{
			toastr.info(body, notification.title);
		}
	}
	
	/**
     * Options
     * @type {Object}
     */
    this.opts = $.extend({
        pollUrl: '', // Overwritten by widget
        markAsReadUrl: '', // Overwritten by widget
        markAsUnreadUrl: '', // Overwritten by widget
        readAllUrl: '', // Overwritten by widget
        unreadAllUrl: '', // Overwritten by widget
        flashUrl: '',
        pollInterval: 5000,
        pollSeen: false,
        xhrTimeout: 2000,
        delay: 5000,
        theme: null,
        counters: [],
        markAllReadSelector: null,
        markAllUnreadSelector: null,
        viewAllSelector: null,
        viewUnreadSelector: null,
        headerSelector: null,
        headerTitle: null,
        headerTemplate: null,
        listSelector: null,
        pageSize: 10, // Cantidad de notificaciones que se agregan en cada scroll
        listItemTemplate:
            '<div class="notificationRow {readClass}" id="notification_{id}" data-keepOpenOnClick>' +
                '<div class="notification-content" onclick="goToRoute(\'{id}\');">' +
                    '<div class="notification-title">{title}</div>' +
                    '<div class="notification-body">{body}</div>' +
                    '<div class="notification-footer">{footer}</div>' +
                    '<div class="notification-meta">Hace {timeago}</div>' +
                '</div>' +
                '<div class="notification-actions">{read}{unread}</div>' +
            '</div>',
        listItemBeforeRender: function (elem) {
            return elem;
        }
    }, options);

	// Cantidad de notificaciones dibujadas en la lista (crece con el scroll)
	this.visibleCount = this.opts.pageSize;
	this.deshabilitarAccionesLista = false;

	this.pollSection = function(seccion=seccion_activa, all=0){
		$.ajax({
			url: this.opts.pollSectionUrl,
			method: "GET",
			data: {
				claves: ((seccion == 1) ? JSON.stringify(this.opts.clavesSeccionNotificaciones) : JSON.stringify(this.opts.clavesSeccionAlertas)),
				seccion: seccion, 
				all:all, 
			},
			dataType: "json",
        		complete: function(){
        			if(self.opts.pollInterval != false){
        				self.currentTimer = setTimeout(function() {
                			self.pollSection(seccion,all)
            			}, self.opts.pollInterval);
        			}
        		},
        		timeout: self.opts.xhrTimeout
        	})
		.done(function(data, textStatus, jqXHR){
			var response = jqXHR.responseJSON;
			var notifications = response.notificacionesSeccion;
			totalNoLeidas = response.totalNoLeidas;
			currentNotifications = notifications;
			notificacionesTotales = response.notificacionesTotales;
			processNotifications(seccion);
		});
    }
    

    this.poll = function(all=0){
		$.ajax({
			url: this.opts.pollUrl,
			method: "GET",
			data: {all:all},
			dataType: "json",
        		complete: function(){
        			if(self.opts.pollInterval != false){
        				self.currentTimer = setTimeout(function() {
                			self.poll(all,1)
            			}, self.opts.pollInterval);
        			}
        		},
        		timeout: self.opts.xhrTimeout
        	})
		.done(function(data, textStatus, jqXHR){
			var notifications = jqXHR.responseJSON;
			currentNotifications = notifications;
			notificacionesTotales = currentNotifications;
			processNotifications();
		});
    }
    
    this.processNotifications = function(seccion=null){
		var deshabilitarAcciones = false;

		if(seccion == null) {
			updateCounters();

			for(i in currentNotifications){
				var notification = currentNotifications[i];
				if(notification.flashed == 0){
					notify(notification);
				}
			}
		}else{
			this.actualizarContadoresSecciones(seccion)
			deshabilitarAcciones = ((seccion == 2) ? true : false)
			for(i in this.notificacionesTotales){
				var notification = this.notificacionesTotales[i];

				if(notification.flashed == 0){
					notify(notification);
				}
			}
		}
		renderList(deshabilitarAcciones);
    }

	/** Contenedor con scroll de la lista (el <ul class="scroll"> del layout, o el padre de la lista) */
	this.getScrollContainer = function(){
		var $list = $(opts.listSelector);
		var $scroll = $list.closest('.scroll');
		return $scroll.length ? $scroll : $list.parent();
	}

	/** Dibuja las primeras visibleCount notificaciones manteniendo la posición del scroll */
	this.renderList = function(deshabilitarAcciones){
		if(opts.listSelector == null || opts.listSelector == ""){
			return;
		}
		deshabilitarAccionesLista = deshabilitarAcciones;

		var $list = $(opts.listSelector);
		var $scroll = getScrollContainer();
		var scrollTop = $scroll.scrollTop();
		var visibles = $.makeArray(currentNotifications).slice(0, visibleCount);
		var rows = "";
		for(var j = 0; j < visibles.length; j++){
			rows += renderRow(visibles[j], deshabilitarAcciones);
		}

		$list.find('[data-bs-toggle="tooltip"]').tooltip('dispose');
		$list.empty().append(rows);
		initTooltips(visibles);
		$scroll.scrollTop(scrollTop);
	}

	/** Agrega la siguiente página de notificaciones al final de la lista */
	this.renderNextPage = function(){
		var todas = $.makeArray(currentNotifications);
		if(visibleCount >= todas.length){
			return;
		}
		var siguientes = todas.slice(visibleCount, visibleCount + opts.pageSize);
		var rows = "";
		for(var j = 0; j < siguientes.length; j++){
			rows += renderRow(siguientes[j], deshabilitarAccionesLista);
		}
		visibleCount += opts.pageSize;
		$(opts.listSelector).append(rows);
		initTooltips(siguientes);
	}

	this.initTooltips = function(notifications){
		for(var j = 0; j < notifications.length; j++){
			$('#notification_read_'+ notifications[j].id).tooltip();
			$('#notification_unread_'+ notifications[j].id).tooltip();
		}
	}

	/** Vuelve la lista a la primera página (al cambiar de sección) */
	this.resetPagination = function(){
		visibleCount = opts.pageSize;
		getScrollContainer().scrollTop(0);
	}


	this.actualizarContadoresSecciones = function(seccion){
		var unreadCount = countUnread();

		if(seccion_activa == SECCION_NOTIF)
		{
			$(this.opts.viewNotificacionesSelector+'-contador').text(unreadCount)
			$(this.opts.viewAlertasSelector + '-contador').text(totalNoLeidas - unreadCount)
		}else{
			$(this.opts.viewAlertasSelector+'-contador').text(unreadCount)
			$(this.opts.viewNotificacionesSelector + '-contador').text(totalNoLeidas - unreadCount)
		}
		// Update all counters
		for (var i = 0; i < opts.counters.length; i++) {
			if ($(opts.counters[i]).text() != totalNoLeidas) {
				$(opts.counters[i]).text(totalNoLeidas);
			}
		}
	}
    
    this.updateCounters = function(seccion){
		var unreadCount = countUnread();
		// Update all counters
		for (var i = 0; i < opts.counters.length; i++) {
			if ($(opts.counters[i]).text() != unreadCount) {
				$(opts.counters[i]).text(unreadCount);
			}
		}
    }
    
    this.countUnread = function(){
	    	var count = 0;
	    	for(i in currentNotifications){
	    		var notification = currentNotifications[i];
	    		if(notification.read == 0){
	    			count += 1;
	    		}
	    	}
	    	return count;
    }
    
    this.getNotificationIndex = function(id){
	    	for(i in notificacionesTotales){
	    		if(notificacionesTotales[i].id == id){
	    			return i;
	    		}
	    	}
    }
    
    this.getNotificationIds = function(){
        	var ids = []; 
        	for(i in currentNotifications){
        		ids.push(currentNotifications[i].id);
        	}
        	return ids;
    }
    
    this.markAsRead = function(id){
		$.ajax({
			url: this.opts.markAsReadUrl,
			method: "POST",
			data: {id:id, clavesAlerta: JSON.stringify(this.opts.clavesSeccionAlertas)},
			dataType: "json"
		})
		.done(function(data, textStatus, jqXHR){
			// El servidor no marca como leídas las alertas: si sigue sin leer no se toca nada
			if(data == null || data.read != 1){
				return;
			}
			if($("#notification_read_"+id).length){
				$("#notification_read_"+id).hide();
				$("#notification_unread_"+id).show();
			}
			$("#notification_"+id).removeClass('is-unread');

			// Se actualiza la notificación en las dos listas para que los contadores coincidan
			var estabaNoLeida = setNotificationRead(id, 1);
			if(self.opts.dividirEnSecciones)
			{
				if(estabaNoLeida){
					totalNoLeidas -= 1;
				}
				actualizarContadoresSecciones(seccion_activa)
			}else{
				updateCounters()
			}
		});
    }

	/**
	 * Cambia el estado de lectura de una notificación en currentNotifications y notificacionesTotales.
	 * Devuelve true si el estado cambió en alguna de las dos listas.
	 */
	this.setNotificationRead = function(id, read){
		var cambio = false;
		var listas = [currentNotifications, notificacionesTotales];
		for(var l = 0; l < listas.length; l++){
			for(var k in listas[l]){
				if(listas[l][k].id == id && listas[l][k].read != read){
					listas[l][k].read = read;
					cambio = true;
				}
			}
		}
		return cambio;
	}
    
    this.markAsUnread = function(id){
    		$.ajax({
    			url: this.opts.markAsUnreadUrl,
    			method: "GET",
    			data: {id:id},
    			dataType: "json"
    		})
    		.done(function(data, textStatus, jqXHR){
    			if($("#notification_read_"+id).length){
    				$("#notification_read_"+id).show();
    				$("#notification_unread_"+id).hide();
    			}
    			$("#notification_"+id).addClass('is-unread');
    			var estabaLeida = setNotificationRead(id, 0);
    			if(self.opts.dividirEnSecciones){
    				if(estabaLeida){
    					totalNoLeidas += 1;
    				}
    				actualizarContadoresSecciones(seccion_activa);
    			}else{
    				updateCounters();
    			}
    		});
    }
    
    this.markAllAsRead = function(){
    		var ids = getNotificationIds();
    		$.ajax({
    			url: this.opts.readAllUrl,
    			method: "POST",
    			data: {ids:ids},
    			dataType: "json"
    		})
    		.done(function(data, textStatus, jqXHR){
    			var notifications = jqXHR.responseJSON;
    			currentNotifications = notifications;
    			processNotifications();
    		});
    }
    
    this.markAllAsUnread = function(){
    		var ids = getNotificationIds();
        	$.ajax({
    			url: this.opts.unreadAllUrl,
    			method: "POST",
    			data: {ids:ids},
    			dataType: "json"
    		})
    		.done(function(data, textStatus, jqXHR){
    			var notifications = jqXHR.responseJSON;
    			currentNotifications = notifications;
    			processNotifications();
    		});
    }
    
    this.flash = function(notification){
        	$.ajax({
    			url: this.opts.flashUrl,
    			method: "GET",
    			data: {id:notification.id},
    			dataType: "json"
    		})
    		.done(function(data, textStatus, jqXHR){
    			//Update reference in currentNotifications array.
    			var index = getNotificationIndex(notification.id);
    			notificacionesTotales[index].flashed = 1;
    		});
    }
    
    this.goToRoute = function(id){
        	var index = getNotificationIndex(id);
        	var notification = notificacionesTotales[index];
        	if(notification.url != null && notification.url != ""){
        		window.location = notification.url;
        	}
			markAsRead(id);
    }
    
    this.renderHeader = function(headerSelector){
    		var html = "";
    		
    		html += self.opts.headerTemplate;
    		html = html.replace(/\{title}/g, self.opts.headerTitle);
    		html = html.replace(/\{readAllId}/g, self.opts.markAllReadSelector.substr(1));
    		html = html.replace(/\{unreadAllId}/g, self.opts.markAllUnreadSelector.substr(1));
    		html = html.replace(/\{verNotificacionesId}/g, self.opts.viewNotificacionesSelector.substr(1));
			html = html.replace(/\{verAlertasId}/g, self.opts.viewAlertasSelector.substr(1));
    		return html;
    }
    
    this.renderRow = function(notification, deshabilitarAcciones = false){
    		var html = "";
    		
    		html += self.opts.listItemTemplate; 
    		html = html.replace(/\{id}/g, notification.id);
    		html = html.replace(/\{title}/g, notification.title);
    		html = html.replace(/\{body}/g, notification.body);
    		html = html.replace(/\{url}/g, notification.url);
    		html = html.replace(/\{footer}/g, notification.footer);
    		html = html.replace(/\{readClass}/g, (notification.read == 0) ? 'is-unread' : '');
			if(!deshabilitarAcciones)
			{
				if(notification.read == 1){
					html = html.replace(/\{read}/g, '<button id="notification_read_'+ notification.id + '" style="display:none;" onclick="markAsRead(' + notification.id + ');" class="notification-read" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-container="body" title="Marcar como leída" data-keepOpenOnClick></button>');
					html = html.replace(/\{unread}/g, '<button id="notification_unread_'+ notification.id + '" onclick="markAsUnread(' + notification.id + ');" class="notification-unread" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-container="body" title="Marcar como no leída" data-keepOpenOnClick></button>');
				}else{
					html = html.replace(/\{read}/g, '<button id="notification_read_'+ notification.id + '" onclick="markAsRead(' + notification.id + ');" class="notification-read" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-container="body" title="Marcar como leída" data-keepOpenOnClick></button>');
					html = html.replace(/\{unread}/g, '<button id="notification_unread_'+ notification.id + '" style="display:none;" onclick="markAsUnread(' + notification.id + ');" class="notification-unread" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-container="body" title="Marcar como no leída" data-keepOpenOnClick></button>');
				}
			}else{
				html = html.replace(/\{read}/g, '');
				html = html.replace(/\{unread}/g, '');
			}
    		
    		html = html.replace(/\{timeago}/g, '<span class="notification-timeago">' + $.timeago(notification.date) +'</span>');
        
        return html;
    }
    
    this.initializeSelectors = function(){
    		if(self.opts.viewAllSelector != null && self.opts.viewAllSelector != ""){
			$('body').on('click', self.opts.viewAllSelector, function(){
				clearTimeout(self.currentTimer);
				poll(1); //Poll for all notifications.
//				if(self.opts.markAllReadSelector != null && self.opts.markAllReadSelector != ""){
//					$(self.opts.markAllReadSelector).hide();
//					$(self.opts.markAllUnreadSelector).show();
//				}
			});
		}
		
		if(self.opts.viewUnreadSelector != null && self.opts.viewUnreadSelector != ""){
			$('body').on('click', self.opts.viewUnreadSelector, function(){
				clearTimeout(self.currentTimer);
				poll(0); //Poll for unread notifications.
//				if(self.opts.markAllReadSelector != null && self.opts.markAllReadSelector != ""){
//					$(self.opts.markAllReadSelector).show();
//					$(self.opts.markAllUnreadSelector).hide();
//				}
			});
		}

		if(self.opts.viewNotificacionesSelector != null && self.opts.viewNotificacionesSelector != ""){
			$('body').on('click', self.opts.viewNotificacionesSelector, function(){
				clearTimeout(self.currentTimer);
				seccion_activa = SECCION_NOTIF
				resetPagination();
				pollSection(seccion_activa);
			});
		}

		if(self.opts.viewAlertasSelector != null && self.opts.viewAlertasSelector != ""){
			$('body').on('click', self.opts.viewAlertasSelector, function(){
				clearTimeout(self.currentTimer);
				seccion_activa = SECCION_ALERTAS
				resetPagination();
				pollSection(seccion_activa)
			});
		}
		
		if(self.opts.markAllReadSelector != null && self.opts.markAllReadSelector != ""){
			$('body').on('click', self.opts.markAllReadSelector, function(e){
				markAllAsRead(); //Poll for unread notifications.
			});
		}
		
		if(self.opts.markAllUnreadSelector != null && self.opts.markAllUnreadSelector != ""){
			$('body').on('click', self.opts.markAllUnreadSelector, function(){
				markAllAsUnread(); //Poll for unread notifications.
			});
		}
    }
    
//        notify();
    
    $(document).ready(function(){
    		// Bootstrap 5: el dropdown se cierra con clics internos (autoClose). Se cancela el cierre
    		// cuando el clic viene de un elemento marcado con data-keepOpenOnClick.
    		var $dropdown = $(opts.listSelector).closest('.dropdown');
    		$dropdown.find('[data-bs-toggle="dropdown"]').addClass('notifications-toggle');
    		$dropdown.on('hide.bs.dropdown', function(e) {
    			if (e.clickEvent && $(e.clickEvent.target).closest('[data-keepOpenOnClick]').length) {
    				e.preventDefault();
    			}
    		});
		
    		if(opts.headerSelector != null && opts.headerSelector != ""){
    			var header = renderHeader(opts.headerSelector);
    			$(opts.headerSelector).empty().append(header);
    		}
    		
    		initializeSelectors();

    		// Scroll infinito: al acercarse al final de la lista se agregan más notificaciones
    		getScrollContainer().on('scroll', function(){
    			if(this.scrollTop + this.clientHeight >= this.scrollHeight - 40){
    				renderNextPage();
    			}
    		});
    });
    
    return this;
});