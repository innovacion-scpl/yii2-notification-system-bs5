<?php 

// namespace frontend\modules\unsplash;
namespace cbtech\notification_system\widgets;

use Yii;
use yii\base\Widget;
use yii\helpers\Html;
use cbtech\notification_system\assets\NotificationAsset;
use yii\base\Exception;
use yii\helpers\Url;
use yii\web\JsExpression;
use yii\helpers\Json;

class NotificationsWidget extends Widget
{
	 /**
     * @var string The URL for the poll() for new notifications controller action
     */
	public $pollUrl = '/notifications/notifications/poll';

    /**
     * @var string The URL for the poll() for new notifications controller action
     */
	public $pollSectionUrl = '/notifications/notifications/poll-section';
	
	/**
     * @var string The URL for the controller action that marks an individual notification as read
     */
	public $markAsReadUrl = '/notifications/notifications/read';
	
	/**
     * @var string The URL for the controller action that marks an individual notification as unread
     */
	public $markAsUnreadUrl = '/notifications/notifications/unread';
	
	/**
     * @var string The URL for the controller action that marks an individual notification as having been flashed
     */
	public $flashUrl = '/notifications/notifications/flash';
	
	/**
     * @var string The URL for the controller action that marks all notifications as read
     */
	public $readAllUrl = '/notifications/notifications/read-all';
	
	/**
     * @var string The URL for the controller action that marks all notifications as unread
     */
	public $unreadAllUrl = '/notifications/notifications/unread-all';

    /**
     * @var string URL de la acción del controlador que obtiene el listado de notificaciones
     */
	public $verNotificacionesUrl = '/notifications/notifications/ver-notificaciones';
	
	/**
     * @var string URL de la acción del controlador que obtiene el listado de alertas
     */
	public $verAlertasUrl = '/notifications/notifications/ver-alertas';

	/**
     * @var array additional options to be passed to the notification library.
     * Please refer to the plugin project page for available options.
     */
    public $clientOptions = [];
    
//     /**
//      * @var string the library name to be used for notifications
//      * One of the THEME_XXX constants
//      */
//     public $theme = null;

    /**
     * @var integer The time to leave the notification shown on screen
     */
    public $delay = 5000;
    
    /**
     * @var integer the XHR timeout in milliseconds
     */
    public $xhrTimeout = 2000;
    
    /**
     * @var integer The delay between pulls
     */
    public $pollInterval = 5000;
    
     /**
     * @var array An array of jQuery selector to be updated with the current
     *            notifications count
     */
    public $counters = [];
     
     /**
     * @var string The jQuery selector for the Mark All as Read button
     */
    public $markAllReadSelector = null;
    
    /**
     * @var string The jQuery selector for the Mark All as Unread button
     */
    public $markAllUnreadSelector = null;

    /**
     * @var string The jQuery selector in which the notifications list should
     *             be rendered
     */
    public $listSelector = null;
    
    /**
     * @var string The jQuery selector for the View All button
     */
    public $viewAllSelector = null;
    
    /**
     * @var string The jQuery selector for the View Unread button
     */
    public $viewUnreadSelector = null;

    /**
     * @var string The jQuery selector for the Notificaciones button
     */
    public $viewNotificacionesSelector = null;
    
    /**
     * @var string The jQuery selector for the Alertas button
     */
    public $viewAlertasSelector = null;

    /**
     * @var boolean Define si se debe mostrar el listado de notificaciones divido
     * en dos secciones diferentes. 
     */
    public $dividirEnSecciones = false;

    /**
     * @var array El listado de claves a mostrar en la sección "Notificaciones"
     */
    public $clavesSeccionNotificaciones = [];

    /**
     * @var array El listado de claves a mostrar en la sección "Alertas"
     */
    public $clavesSeccionAlertas = [];

    /**
     * @var string The jQuery selector for the Notifications header view
     */
    public $headerSelector = null;
    
    /**
     * @var string The list item HTML template
     */
    public $listItemTemplate = null;
    
    /**
     * @var string The header HTML template
     */
    public $headerTemplate = null;
    
    /**
     * @var string The header title
     */
    public $headerTitle = "Notifications";
	

    public function init()
    {
        parent::init();
    }

	/**
     * @inheritdoc
     */
    public function run()
    {
//         if (!isset($this->timeAgoLocale)) {
//             $this->timeAgoLocale = Yii::$app->language;
//         }
        $this->registerAssets();
    }
    

    /**
     * Registers the needed assets
     */
    public function registerAssets()
    {
        $view = $this->getView();
        NotificationAsset::register($view);
			
        //Set basic params
        $params = [
            'xhrTimeout' => Html::encode($this->xhrTimeout),
            'delay' => Html::encode($this->delay),
            'options' => $this->clientOptions,
            'pollInterval' => Html::encode($this->pollInterval),
            'counters' => $this->counters,
            'dividirEnSecciones' => $this->dividirEnSecciones,
            'clavesSeccionNotificaciones' => $this->clavesSeccionNotificaciones,
            'clavesSeccionAlertas' => $this->clavesSeccionAlertas
        ];

        //Set the URLs
		$params['pollUrl'] = $this->pollUrl;
        $params['pollSectionUrl'] = $this->pollSectionUrl;
        $params['markAsReadUrl'] = $this->markAsReadUrl;
        $params['markAsUnreadUrl'] = $this->markAsUnreadUrl;
		$params['flashUrl'] = $this->flashUrl;
		$params['readAllUrl'] = $this->readAllUrl;
		$params['unreadAllUrl'] = $this->unreadAllUrl;
        $params['verNotificacionesUrl'] = $this->verNotificacionesUrl;
        $params['verAlertasUrl'] = $this->verAlertasUrl;
		
//         if ($this->theme) {
//             $params['theme'] = Html::encode($this->theme);
//         }

		//Set the jQuery Selectors
        if ($this->markAllReadSelector) {
            $params['markAllReadSelector'] = $this->markAllReadSelector;
        }
        if ($this->markAllUnreadSelector) {
            $params['markAllUnreadSelector'] = $this->markAllUnreadSelector;
        }
        if ($this->listSelector) {
            $params['listSelector'] = $this->listSelector;
            if ($this->listItemTemplate) {
                $params['listItemTemplate'] = $this->listItemTemplate;
            }
//             if ($this->listItemBeforeRender instanceof JsExpression) {
//                 $params['listItemBeforeRender'] = $this->listItemBeforeRender;
//             }
        }
        
        if($this->viewAllSelector){
        		$params["viewAllSelector"] = $this->viewAllSelector;
        }
        
        if($this->viewUnreadSelector){
        		$params["viewUnreadSelector"] = $this->viewUnreadSelector;
        }

        if($this->viewAlertasSelector){
            $params["viewAlertasSelector"] = $this->viewAlertasSelector;
        }

        if($this->viewNotificacionesSelector){
            $params["viewNotificacionesSelector"] = $this->viewNotificacionesSelector;
        }
        
        if($this->headerSelector){
        		$params["headerSelector"] = $this->headerSelector;
        		if(!$this->dividirEnSecciones){
        			$params["headerTemplate"] = '<div class="col-xs-12">'. 
                                                    '<div class="float-start" style="font-size:14px;font-weight:bold;">{title}</div>' . 
                                                    '<label style="font-size:12px" class="float-start">Marcar todas como</label>' .
                                                    '<button id="{readAllId}" class="btn btn-sm btn-link " style="color:#3399ff;" data-keepOpenOnClick>Leídas</button>' . 
                                                    '<button id="{unreadAllId}" class="btn btn-sm btn-link" style="color:#3399ff;" data-keepOpenOnClick>No leídas</button>' . 
                                                    
                                                '</div>';
        		}else{
                    $params["headerTemplate"] = '<div class="notifications-header" style="margin-bottom:1%">'.
                                                    '<div class="col-xs-12">' . 
                                                        '<button id="{verNotificacionesId}" class="btn btn-xs btn-primary" style="margin-right:1%;" data-keepOpenOnClick>
                                                            <span id="{verNotificacionesId}-contador" class="badge">0</span> Notificaciones
                                                        </button>' . 
                                                        '<button id="{verAlertasId}" class="btn btn-xs btn-danger" data-keepOpenOnClick>
                                                            <span id="{verAlertasId}-contador" class="badge">0</span> Alertas  
                                                        </button>' .                
                                                    '</div>'.
                                                '</div>'; 
                }
        }
        
        if($this->headerTitle){
        		$params["headerTitle"] = $this->headerTitle;
        }
        
        $js = 'var notificationSystem = Notifications(' . Json::encode($params,JSON_PRETTY_PRINT) . ');
                notificationSystem.pollSection(1,0);';
        $view->registerJs($js);
    }
}
