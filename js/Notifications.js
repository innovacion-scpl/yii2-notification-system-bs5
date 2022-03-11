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
        listItemTemplate:
            '<div class="notificationRow" id="notification_{id}" data-keepOpenOnClick>' +
                '<div class="col-xs-11" onclick="goToRoute(\'{id}\');" style="cursor:pointer;">' +
                    '<div class="notification-title">{title}</div>' +
                    '<div class="notification-body">{body}</div>' +
                '</div>' +
                '<div class="col-xs-1">' +
                    '<div class="notification-actions pull-right">{read}{unread}</div>' +
                '</div>' +
                '<div class="clearfix"></div>' + 
                '<div class="col-xs-1">' +
        				'<div class="notification-timeago">{timeago}</div>' +
        			'</div>' +
                '<div class="col-xs-10">' +
                    '<div class="notification-footer">{footer}</div>' +
                '</div>' +
                '<div class="clearfix"></div>' + 
//                    '<hr/>' +
            '</div>',
        listItemBeforeRender: function (elem) {
            return elem;
        }
    }, options);
    
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
    

    // this.poll = function(seccion=SECCION_NOTIF, all=0){
	// 	$.ajax({
	// 		url: this.opts.pollUrl,
	// 		method: "GET",
	// 		data: {seccion: seccion, all:all},
	// 		dataType: "json",
    //     		complete: function(){
    //     			if(self.opts.pollInterval != false){
    //     				self.currentTimer = setTimeout(function() {
    //             			self.poll(all,1)
    //         			}, self.opts.pollInterval);
    //     			}
    //     		},
    //     		timeout: self.opts.xhrTimeout
    //     	})
	// 	.done(function(data, textStatus, jqXHR){
	// 		var notifications = jqXHR.responseJSON;
	// 		currentNotifications = notifications;
	// 		processNotifications();
	// 	});
    // }
    
    this.processNotifications = function(seccion=null){
		var rows = "";
		
		if(seccion == null) {
			updateCounters();
			
			for(i in currentNotifications){
				var notification = currentNotifications[i];
				if(notification.flashed == 0){
					notify(notification);
				}
				rows += renderRow(notification);
			}
		}else{
			this.actualizarContadoresSecciones(seccion)
			var claves = ((seccion == 1) ? JSON.stringify(this.opts.clavesSeccionNotificaciones) : JSON.stringify(this.opts.clavesSeccionAlertas))
			var deshabilitarAcciones = ((seccion == 2) ? true : false)
			for(i in this.notificacionesTotales){
				var notification = this.notificacionesTotales[i];

				if(notification.flashed == 0){
					notify(notification);
				}
			}
			for(i in this.currentNotifications){
				notification = this.currentNotifications[i];
				rows += renderRow(notification, deshabilitarAcciones)
			}
		}
		if(opts.listSelector != null && opts.listSelector != ""){
			$(opts.listSelector).empty().append(rows);
			//Initialize bootstrap tooltips
			for(i in currentNotifications){
				var notification = currentNotifications[i];
				$('#notification_read_'+ notification.id).tooltip();
				$('#notification_unread_'+ notification.id).tooltip();
			}
		}
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
	    	for(i in currentNotifications){
	    		if(currentNotifications[i].id == id){
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
			data: {id:id},
			dataType: "json"
		})
		.done(function(data, textStatus, jqXHR){
			if($("#notification_read_"+id).length){
				$("#notification_read_"+id).hide();
				$("#notification_unread_"+id).show();
			}

			if(self.opts.dividirEnSecciones)
			{
				if(seccion_activa == SECCION_NOTIF){
					//Remove the notification from the currentNotifications array.
					var index = getNotificationIndex(id);
					currentNotifications[index].read = 1;
					totalNoLeidas -= 1;
				}
				actualizarContadoresSecciones(seccion_activa)
			}else{
				//Remove the notification from the currentNotifications array.
				var index = getNotificationIndex(id);
				currentNotifications[index].read = 1;
				updateCounters()
			}
		});
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
//	    			//Remove the notification from the currentNotifications array.
    			var index = getNotificationIndex(id);
    			currentNotifications[index].read = 0;
//	    			currentNotifications.splice(index,1);
    			updateCounters();
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

	// this.verNotifPorTipo = function(seccion=this.SECCION_NOTIF){
	// 	$.ajax({
	// 		url: this.opts.pollSectionUrl,
	// 		dataType: "json"
	// 	})
	// 	.done(function(data, textStatus, jqXHR){
	// 		var notifications = jqXHR.responseJSON;
	// 		currentNotifications = notifications;
	// 		// processNotifications();
	// 		pollSection(seccion);
	// 	});
	// }
    
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
    			currentNotifications[index].flashed = 1;
    		});
    }
    
    this.goToRoute = function(id){
        	var index = getNotificationIndex(id);
        	var notification = currentNotifications[index];
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
			if(!deshabilitarAcciones)
			{
				if(notification.read == 1){
					html = html.replace(/\{read}/g, '<button id="notification_read_'+ notification.id + '" style="display:none;" onclick="markAsRead(' + notification.id + ');" class="notification-read" data-toggle="tooltip" data-placement="bottom" data-container="body" title="Mark as read" data-keepOpenOnClick></button>');
					html = html.replace(/\{unread}/g, '<button id="notification_unread_'+ notification.id + '" onclick="markAsUnread(' + notification.id + ');" class="notification-unread" data-toggle="tooltip" data-placement="bottom" data-container="body" title="Mark as unread" data-keepOpenOnClick></button>');
				}else{
					html = html.replace(/\{read}/g, '<button id="notification_read_'+ notification.id + '" onclick="markAsRead(' + notification.id + ');" class="notification-read" data-toggle="tooltip" data-placement="bottom" data-container="body" title="Mark as read" data-keepOpenOnClick></button>');
					html = html.replace(/\{unread}/g, '<button id="notification_unread_'+ notification.id + '" style="display:none;" onclick="markAsUnread(' + notification.id + ');" class="notification-unread" data-toggle="tooltip" data-placement="bottom" data-container="body" title="Mark as unread" data-keepOpenOnClick></button>');
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
				pollSection(seccion_activa);
			});
		}

		if(self.opts.viewAlertasSelector != null && self.opts.viewAlertasSelector != ""){
			$('body').on('click', self.opts.viewAlertasSelector, function(){
				clearTimeout(self.currentTimer);
				seccion_activa = SECCION_ALERTAS
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
    		$(document).delegate("[data-keepOpenOnClick]", "click", function(e) {
    			e.stopPropagation();
    		});
		
    		if(opts.headerSelector != null && opts.headerSelector != ""){
    			var header = renderHeader(opts.headerSelector);
    			$(opts.headerSelector).empty().append(header);
    		}
    		
    		initializeSelectors();
    });
    
    return this;
});