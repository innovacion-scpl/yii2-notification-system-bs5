<?php

namespace cbtech\notification_system\controllers;

use Yii;
use yii\helpers\Url;
use yii\helpers\Json;
use yii\web\Response;
use yii\web\Controller;
use yii\web\HttpException;
use common\models\Notificacion;
use cbtech\notification_system\models\Notification;

class NotificationsController extends Controller
{

    /**
     * 
     */

    /**
     * @var integer The current user id
     */
    private $user_id;
    /**
     * @var string The notification class
     */
    private $notificationClass;
    /**
     * @inheritdoc
     */
    public function init()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $this->user_id = $this->module->userId;
        $this->notificationClass = $this->module->notificationClass;
        parent::init();
    }

    private function totalNoLeidas($user_id)
    {
        $class = $this->notificationClass;
        $totalNoLeidas = $class::find()->where(['user_id' => $user_id])
                                ->andWhere(['read' => 0])
                                ->count();
        return $totalNoLeidas;
    }


    /**
     * Poll action
     *
     * @param int $seen Whether to show already seen notifications
     * @return array
     */
    public function actionPollSection($claves, $section=1, $all = 0)
    {
        /** @var Notification $class */
        $claves = Json::decode($claves);
        $class = $this->notificationClass;

        $notifSeccion = $class::find()
                                ->where(['user_id' => $this->user_id])
                                ->andWhere(['or', ["read"=>0], ['flashed'=>0]])
                                ->andWhere(['IN', 'key', array_values($claves)])
                                ->orderBy('read, created_at DESC')
                                ->all(); //OPTIMIZAR --> traer todas y filtrar 

        $notifTodas = $class::find()
                            ->where(['user_id' => $this->user_id])
                            ->andWhere(['or', ["read"=>0], ['flashed'=>0]])
                            ->orderBy('read, created_at DESC')
                            ->all();



        $arrayNotifSeccion = $this->convertModelsToArray($notifSeccion);
        $arrayNotifTotales = $this->convertModelsToArray($notifTodas);
        return [
            'notificacionesSeccion' => $arrayNotifSeccion,
            'notificacionesTotales' => $arrayNotifTotales,
            'totalNoLeidas' => $this->totalNoLeidas($this->user_id),
        ];
    }

    public function actionPoll($all = 0)
    {
//     		\Yii::error($this->notificationClass);
//         $read = $read ? 1 : 0;
//         \Yii::error($read);
        /** @var Notification $class */
        $class = $this->notificationClass;
        $models = $class::find()->where(['user_id' => $this->user_id]);
		if($all == 0){
        	$models->andWhere(['or', ["read"=>0], ['flashed'=>0]]);			
		}else{
			$models->andWhere(['or', ["read"=>0],["read"=>1], ['flashed'=>0]]);	
		}
		$models = $models->orderBy('read, created_at DESC')
						 ->all();
		
        $results = $this->convertModelsToArray($models);
//         \Yii::error(print_r($models,true));
        
//         \Yii::error(print_r($results,true));
        return $results;
    }
    /**
     * Marks a notification as read and redirects the user to the final route
     *
     * @param int $id The notification id
     * @return Response
     * @throws HttpException Throws an exception if the notification is not
     *         found, or if it don't belongs to the logged in user
     */
    public function actionRnr($id)
    {
        $notification = $this->actionRead($id);
        return $this->redirect(Url::to($notification->getRoute()));
    }
    /**
     * Marks a notification as read
     *
     * @param int $id The notification id
     * @return Notification The updated notification record
     * @throws HttpException Throws an exception if the notification is not
     *         found, or if it don't belongs to the logged in user
     */
    public function actionRead()
    {
        $id = Yii::$app->request->post('id');
        $clavesAlerta = Json::decode(Yii::$app->request->post('clavesAlerta'));
        $notification = $this->getNotification($id);

        if(!in_array($notification->key, $clavesAlerta))
        {
            $notification->read = 1;
            $notification->save();
        }
        return $notification;
    }
    /**
     * Marks all notification as read
     *
     * @throws HttpException Throws an exception if the notification is not
     *         found, or if it don't belongs to the logged in user
     */
    public function actionReadAll()
    {
        $notificationsIds = Yii::$app->request->post('ids', []);
        $notifications = [];
        foreach ($notificationsIds as $id) {
            $notification = $this->getNotification($id);
            $notification->read = 1;
            $notification->save();
            array_push($notifications, $notification);
        }
        return $this->convertModelsToArray($notifications);
    }
    
	public function actionUnread($id)
    {
        $notification = $this->getNotification($id);
        $notification->read = 0;
        $notification->save();
        return $notification;
    }
    /**
     * Unread all notifications
     *
     * @throws HttpException Throws an exception if the notification is not
     *         found, or if it don't belongs to the logged in user
     */
    public function actionUnreadAll()
    {
        $notificationsIds = Yii::$app->request->post('ids', []);
        $notifications = [];
        foreach ($notificationsIds as $id) {
            $notification = $this->getNotification($id);
            $notification->read = 0;
            $notification->save();
            array_push($notifications, $notification);
        }
        return $this->convertModelsToArray($notifications);
    }
    
    public function actionFlash($id)
    {
        $notification = $this->getNotification($id);
        $notification->flashed = 1;
        $notification->save();
        return $notification;
    }


    /** Retorna el listado de notificaciones  */
    public function actionVerNotificaciones()
    {
        $class = $this->notificationClass;
        $modelos = $class::find()
                            ->where(['key' => 'nota_cerrada'])
                            ->andWhere(['read' => 0]) 
                            ->andWhere(['user_id' => $this->user_id])
                            ->all();
        return $this->convertModelsToArray($modelos);
    }

    /** Retorna el listado de alertas  */
    public function actionVerAlertas()
    {
        $modelos = Notificacion::find()
                            ->where(['key' => 'nota_recibida'])
                            ->andWhere(['read' => 0]) 
                            ->andWhere(['user_id' => $this->user_id])
                            ->all();
        return $this->convertModelsToArray($modelos);
    }


    /**
     * Gets a notification by id
     *
     * @param int $id The notification id
     * @return Notification
     * @throws HttpException Throws an exception if the notification is not
     *         found, or if it don't belongs to the logged in user
     */
    private function getNotification($id)
    {
        /** @var Notification $notification */
        $class = $this->notificationClass;
        $notification = $class::findOne($id);
        if (!$notification) {
            throw new HttpException(404, "Unknown notification");
        }
        if ($notification->user_id != $this->user_id) {
            throw new HttpException(500, "Not your notification");
        }
        return $notification;
    }
    
    private function convertModelsToArray($models){
    		$results = [];
    		foreach ($models as $model) {
            // give user a chance to parse the date as needed
//             $date = date('Y-m-d H:i:s');
            /** @var Notification $model */
            $results[] = [
                'id' => $model->id,
                'type' => $model->type,
                'title' => $model->getTitle(),
                'body' => $model->getBody(),
                'footer' => $model->getFooter(),
                'url' => $model->getRoute(),
                'key' => $model->key,
           	 	'key_id' => $model->key_id,
                'flashed' => $model->flashed,
            		'read' => $model->read,
                'date' => $model->created_at,
            ];
        }
        
        return $results;
    }
}