// ==========================================
// --- КОНФИГУРАЦИЯ БЛОКОВ ---
// ==========================================
const BLOCK_DEFINITIONS = [
	// --- СОБЫТИЯ ---
	{
		id: 'evt_start',
		category: 'События',
		label: 'При старте',
		desc: 'Выполняет прикрепленные блоки один раз сразу после запуска сцены.',
		icon: 'ri-flag-fill',
		color: '#00E676',
	},
	{
		id: 'evt_object_click',
		category: 'События',
		label: 'Нажатие на объект',
		desc: 'При клике мышкой на указанный объект выполняет прикрепленные блоки.',
		icon: 'ri-cursor-fill',
		color: '#00E676',
		inputs: [{ label: 'Имя объекта', default: 'box1' }],
	},
	{
		id: 'evt_key_press',
		category: 'События',
		label: 'Нажатие клавиши',
		desc: 'При нажатии указанной клавиши выполняет прикрепленные блоки.',
		icon: 'ri-keyboard-fill',
		color: '#00E676',
		inputs: [{ label: 'Клавиша (Code)', default: 'KeyW' }],
	},
	// --- СОБЫТИЯ ФИЗИКИ ---
	{
		id: 'evt_collision',
		category: 'События',
		label: 'При столкновении',
		desc: 'Срабатывает, когда два объекта касаются друг друга.',
		icon: 'ri-focus-3-fill',
		color: '#00E676',
		inputs: [
			{ label: 'Объект 1', default: 'player' },
			{ label: 'Объект 2', default: 'enemy' },
		],
	},
	{
		id: 'evt_object_click', // Обновляем существующий или оставляем как есть
		category: 'События',
		label: 'Клик по объекту',
		desc: 'Срабатывает при клике/тапе на объект.',
		icon: 'ri-cursor-fill',
		color: '#00E676',
		inputs: [{ label: 'Объект', default: 'btn_start' }],
	},
	{
		id: 'evt_update',
		category: 'События',
		label: 'Каждый кадр (Update)',
		desc: 'Выполняется постоянно (60 раз в секунду). Осторожно!',
		icon: 'ri-refresh-line',
		color: '#00E676',
		inputs: [],
	},
	{
		id: 'evt_timer',
		category: 'События',
		label: 'Таймер (сек)',
		desc: 'Выполняется каждые N секунд.',
		icon: 'ri-time-line',
		color: '#00E676',
		inputs: [{ label: 'Интервал', default: '1' }],
	},

	{
		id: 'evt_message_send',
		category: 'События',
		label: 'Отправить событие',
		desc: 'Запускает цепочки "При получении события" во всей игре.',
		icon: 'ri-signal-tower-fill',
		color: '#00E676',
		inputs: [
			{ label: 'Название события', default: 'OnDeath' },
			{ label: 'Параметр (опц.)', default: 'player' },
		],
	},
	{
		id: 'evt_message_receive',
		category: 'События',
		label: 'При событии',
		desc: 'Срабатывает, когда кто-то отправляет это событие.',
		icon: 'ri-base-station-line',
		color: '#00E676',
		inputs: [{ label: 'Название события', default: 'OnDeath' }],
	},

	// --- ДВИЖЕНИЕ ---
	{
		id: 'mov_set_pos',
		category: 'Движение',
		label: 'Перейти в точку',
		desc: 'Мгновенно телепортирует объект в указанные координаты X и Y.',
		icon: 'ri-map-pin-fill',
		color: '#6200EA',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'X', default: '100' },
			{ label: 'Y', default: '100' },
		],
	},
	{
		id: 'mov_change_pos',
		category: 'Движение',
		label: 'Сдвинуть на',
		desc: 'Сдвигает объект на указанные значения по осям X и Y относительно его текущей позиции.',
		icon: 'ri-arrow-right-up-line',
		color: '#6200EA',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Δ X', default: '10' },
			{ label: 'Δ Y', default: '0' },
		],
	},
	{
		id: 'mov_look_at',
		category: 'Движение',
		label: 'Смотреть на',
		desc: 'Поворачивает объект в направлении другого объекта.',
		icon: 'ri-eye-2-line',
		color: '#6200EA',
		inputs: [
			{ label: 'Кто', default: 'box1' },
			{ label: 'На кого', default: 'target1' },
		],
	},
	{
		id: 'mov_pin',
		category: 'Движение',
		label: 'Привязка к экрану',
		desc: 'Закрепляет объект относительно окна.',
		icon: 'ri-pushpin-fill',
		color: '#6200EA',
		inputs: [
			{ label: 'Объект', default: 'ui_text' },
			{ label: 'Вкл/Выкл (1/0)', default: '1' },
		],
	},
	{
		id: 'mov_align',
		category: 'Движение',
		label: 'Выровнять',
		desc: 'Выровнивает объект по указанной позиции на экране (лево, центр, право, верх, низ).',
		icon: 'ri-align-item-horizontal-center-fill',
		color: '#6200EA',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Позиция', default: 'center' },
		],
	},
	{
		id: 'ai_patrol',
		category: 'Движение',
		label: 'Патруль (X1 -> X2)',
		desc: 'Двигает объект туда-сюда.',
		icon: 'ri-route-line',
		color: '#6200EA',
		inputs: [
			{ label: 'Объект', default: 'enemy' },
			{ label: 'Min X', default: '100' },
			{ label: 'Max X', default: '500' },
			{ label: 'Скорость', default: '2' },
		],
	},

	// --- ГРУППЫ И ОРГАНИЗАЦИЯ ---
	{
		id: 'grp_add',
		category: 'Группы',
		label: 'Добавить в группу',
		desc: 'Добавляет указанный объект в группу с заданным именем.',
		icon: 'ri-group-fill',
		color: '#FF4081',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Имя группы', default: 'enemies' },
		],
	},
	{
		id: 'grp_remove',
		category: 'Группы',
		label: 'Убрать из группы',
		desc: 'Удаляет указанный объект из группы с заданным именем.',
		icon: 'ri-user-unfollow-line',
		color: '#FF4081',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Имя группы', default: 'enemies' },
		],
	},
	{
		id: 'grp_move',
		category: 'Группы',
		label: 'Двигать группу',
		desc: 'Сдвигает все объекты в указанной группе на заданные значения по осям X и Y.',
		icon: 'ri-drag-move-line',
		color: '#FF4081',
		inputs: [
			{ label: 'Имя группы', default: 'enemies' },
			{ label: 'Сдвиг X', default: '5' },
			{ label: 'Сдвиг Y', default: '0' },
		],
	},
	{
		id: 'grp_state',
		category: 'Группы',
		label: 'Состояние группы',
		desc: 'Показывает или скрывает все объекты в указанной группе.',
		icon: 'ri-eye-close-line',
		color: '#FF4081',
		inputs: [
			{ label: 'Имя группы', default: 'enemies' },
			{ label: 'show/hide', default: 'hide' },
		],
	},
	{
		id: 'grp_delete',
		category: 'Группы',
		label: 'Удалить группу',
		desc: 'Удаляет все объекты из указанной группы и очищает её.',
		icon: 'ri-delete-bin-2-line',
		color: '#FF4081',
		inputs: [{ label: 'Имя группы', default: 'enemies' }],
	},
	{
		id: 'sys_group',
		category: 'Группы',
		label: 'Группа',
		desc: 'Позволяет сворачивать (скрывать) цепочку блоков для удобства.',
		icon: 'ri-folder-open-fill',
		color: '#E91E63',
		inputs: [{ label: 'Название', default: 'Логика врага' }],
	},

	// --- ОКНО ---
	{
		id: 'win_set_title',
		category: 'Окно',
		label: 'Название Окна',
		desc: 'Устанавливает заголовок окна.',
		icon: 'ri-window-line',
		color: '#00B0FF',
		inputs: [{ label: 'Текст', default: 'Ecrous Game' }],
	},
	{
		id: 'win_scale_mode',
		category: 'Окно',
		label: 'Режим масштаба',
		desc: 'Как игра подстраивается под экран.',
		icon: 'ri-aspect-ratio-fill',
		color: '#00B0FF',
		inputs: [
			{
				label: 'Режим',
				default: 'fit',
				type: 'select',
				options: ['fixed', 'fit', 'stretch', 'fill'],
			},
			// fixed = фиксированный размер (как сейчас)
			// fit = вписать с сохранением пропорций (черные полосы)
			// stretch = растянуть (искажение пропорций)
			// fill = заполнить (обрезка краев)
		],
	},
	{
		id: 'win_set_size',
		category: 'Окно',
		label: 'Базовый размер',
		desc: 'Внутреннее разрешение игры (логические пиксели).',
		icon: 'ri-ruler-2-line',
		color: '#00B0FF',
		inputs: [
			{ label: 'Ширина', default: '800' },
			{ label: 'Высота', default: '600' },
		],
	},
	{
		id: 'win_set_cursor',
		category: 'Окно',
		label: 'Курсор мыши',
		desc: 'Меняет вид курсора или скрывает его.',
		icon: 'ri-cursor-fill',
		color: '#00B0FF',
		inputs: [
			{
				label: 'Вид',
				default: 'default',
				type: 'select',
				options: ['default', 'pointer', 'none', 'crosshair', 'text', 'wait'],
			},
		],
	},
	{
		id: 'win_fullscreen',
		category: 'Окно',
		label: 'Полный экран',
		desc: 'Переключает полноэкранный режим (работает по клику).',
		icon: 'ri-fullscreen-fill',
		color: '#00B0FF',
		inputs: [{ label: 'Вкл/Выкл (1/0)', default: '1' }],
	},
	{
		id: 'win_bg_color',
		category: 'Окно',
		label: 'Цвет Фона',
		desc: 'Цвет полос по краям или фона сцены.',
		icon: 'ri-paint-fill',
		color: '#00B0FF',
		inputs: [{ label: 'Цвет', default: '#1a1a1a' }],
	},
	{
		id: 'win_bg_image',
		category: 'Окно',
		label: 'Фото Фона (URL)',
		desc: 'Картинка на фоне.',
		icon: 'ri-image-line',
		color: '#00B0FF',
		inputs: [{ label: 'Ссылка', default: 'https://' }],
	},
	{
		id: 'win_console_state',
		category: 'Окно',
		label: 'Консоль',
		desc: 'Показывает или скрывает консоль разработчика в окне игры.',
		icon: 'ri-terminal-box-line',
		color: '#00B0FF',
		inputs: [{ label: 'Показать/Скрыть', default: 'hide' }],
	},

	// --- ОБЪЕКТЫ ---
	{
		id: 'obj_create_rect_custom',
		category: 'Объекты',
		label: 'Прямоугольник',
		desc: 'Создает прямоугольный объект с заданными размерами, позицией и цветом.',
		icon: 'ri-shape-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'rect1' },
			{ label: 'Ширина', default: '100' },
			{ label: 'Высота', default: '50' },
			{ label: 'X', default: '100' },
			{ label: 'Y', default: '100' },
			{ label: 'Цвет', default: '#ff0000' },
			{ label: 'Углы (радиус)', default: '0' },
		],
	},
	{
		id: 'obj_create_circle',
		category: 'Объекты',
		label: 'Создать Круг',
		desc: 'Создает круглый объект с заданным радиусом, позицией и цветом.',
		icon: 'ri-checkbox-blank-circle-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'circle1' },
			{ label: 'X', default: '200' },
			{ label: 'Y', default: '100' },
			{ label: 'Радиус', default: '25' },
			{ label: 'Цвет', default: '#0000ff' },
		],
	},
	{
		id: 'obj_create_line',
		category: 'Объекты',
		label: 'Создать Линию',
		desc: 'Создает линию между двумя точками с заданной толщиной и цветом.',
		icon: 'ri-pencil-ruler-2-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'line1' },
			{ label: 'X1', default: '50' },
			{ label: 'Y1', default: '50' },
			{ label: 'X2', default: '150' },
			{ label: 'Y2', default: '150' },
			{ label: 'Толщина', default: '2' },
			{ label: 'Цвет', default: '#ffffff' },
		],
	},
	{
		id: 'obj_create_poly',
		category: 'Объекты',
		label: 'Полигон (N-углов)',
		desc: 'Создает правильный многоугольник с заданным количеством углов, радиусом, позицией и цветом.',
		icon: 'ri-shape-2-fill',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'poly1' },
			{ label: 'X', default: '300' },
			{ label: 'Y', default: '100' },
			{ label: 'Радиус', default: '40' },
			{ label: 'Углов', default: '5' },
			{ label: 'Цвет', default: '#ffff00' },
		],
	},
	{
		id: 'obj_clone',
		category: 'Объекты',
		label: 'Клонировать',
		desc: 'Создает копию указанного объекта с новым именем.',
		icon: 'ri-file-copy-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Кого', default: 'box1' },
			{ label: 'Новое имя', default: 'box1_clone' },
		],
	},
	{
		id: 'obj_delete',
		category: 'Объекты',
		label: 'Удалить объект',
		desc: 'Удаляет указанный объект из сцены.',
		icon: 'ri-delete-bin-line',
		color: '#2979FF',
		inputs: [{ label: 'Имя', default: 'box1' }],
	},
	{
		id: 'obj_get_pos',
		category: 'Объекты',
		label: 'Получить позицию',
		desc: 'Записывает X и Y объекта в переменные.',
		icon: 'ri-map-pin-user-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'В перем. X', default: 'obj_x' },
			{ label: 'В перем. Y', default: 'obj_y' },
		],
	},

	// --- СТИЛИЗАЦИЯ ---
	{
		id: 'obj_set_size',
		category: 'Объекты',
		label: 'Уст. Размер',
		desc: 'Устанавливает ширину и высоту указанного объекта.',
		icon: 'ri-fullscreen-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'box1' },
			{ label: 'Ширина', default: '100' },
			{ label: 'Высота', default: '100' },
		],
	},
	{
		id: 'obj_set_scale',
		category: 'Объекты',
		label: 'Уст. Масштаб',
		desc: 'Устанавливает масштаб по осям X и Y для указанного объекта.',
		icon: 'ri-zoom-in-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'box1' },
			{ label: 'X (1=100%)', default: '1.5' },
			{ label: 'Y (1=100%)', default: '1.5' },
		],
	},
	{
		id: 'obj_set_rotate',
		category: 'Объекты',
		label: 'Вращение (град)',
		desc: 'Устанавливает угол поворота в градусах для указанного объекта.',
		icon: 'ri-restart-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'box1' },
			{ label: 'Угол', default: '45' },
		],
	},
	{
		id: 'obj_set_color',
		category: 'Объекты',
		label: 'Уст. Цвет',
		desc: 'Устанавливает цвет указанного объекта на заданный HEX-цвет.',
		icon: 'ri-palette-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'box1' },
			{ label: 'HEX', default: '#00ff00' },
		],
	},
	{
		id: 'obj_set_stroke',
		category: 'Объекты',
		label: 'Обводка',
		desc: 'Устанавливает цвет и толщину обводки для указанного объекта.',
		icon: 'ri-checkbox-blank-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'box1' },
			{ label: 'Цвет', default: '#ffffff' },
			{ label: 'Толщина', default: '2' },
		],
	},
	{
		id: 'obj_set_texture',
		category: 'Объекты',
		label: 'Текстура (URL)',
		desc: 'Устанавливает изображение текстуры для указанного объекта по ссылке URL.',
		icon: 'ri-image-add-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'box1' },
			{ label: 'URL', default: 'https://' },
		],
	},
	{
		id: 'obj_set_zindex',
		category: 'Объекты',
		label: 'Слой (Z-index)',
		desc: 'Устанавливает порядок слоя (z-index) для указанного объекта.',
		icon: 'ri-stack-fill',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'box1' },
			{ label: 'Номер', default: '10' },
		],
	},
	{
		id: 'obj_set_shadow',
		category: 'Объекты',
		label: 'Тень',
		desc: 'Устанавливает цвет и размытие тени для указанного объекта.',
		icon: 'ri-drop-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'box1' },
			{ label: 'Цвет', default: '#000000' },
			{ label: 'Размытие', default: '10' },
		],
	},
	{
		id: 'obj_set_blur',
		category: 'Объекты',
		label: 'Размытие (Blur)',
		desc: 'Устанавливает уровень размытия для указанного объекта в пикселях.',
		icon: 'ri-blur-off-line',
		color: '#2979FF',
		inputs: [
			{ label: 'Имя', default: 'box1' },
			{ label: 'Пиксели', default: '5' },
		],
	},

	// --- ТЕКСТ (ЖЕЛТЫЙ) ---
	{
		id: 'txt_create',
		category: 'Текст',
		label: 'Создать Текст',
		desc: 'Создает текстовый элемент с заданными параметрами: имя, позиция, содержимое, размер и цвет.',
		icon: 'ri-text',
		color: '#FFD600',
		inputs: [
			{ label: 'Имя', default: 'txt1' },
			{ label: 'X', default: '50' },
			{ label: 'Y', default: '50' },
			{ label: 'Текст', default: 'Привет!' },
			{ label: 'Размер', default: '24' },
			{ label: 'Цвет', default: '#ffffff' },
		],
	},
	{
		id: 'txt_modify',
		category: 'Текст',
		label: 'Изменить текст',
		desc: 'Изменяет содержимое указанного текстового элемента на новый текст.',
		icon: 'ri-edit-2-line',
		color: '#FFD600',
		inputs: [
			{ label: 'Элемент', default: 'textScore' },
			{ label: 'Операция', default: 'add' },
			{ label: 'Значение', default: '1' },
		],
	},
	{
		id: 'txt_set_opacity',
		category: 'Текст',
		label: 'Прозр. Текста',
		desc: 'Устанавливает уровень прозрачности для указанного текстового элемента (от 0 до 1).',
		icon: 'ri-contrast-drop-line',
		color: '#FFD600',
		inputs: [
			{ label: 'Имя', default: 'txt1' },
			{ label: 'Значение (0-1)', default: '0.5' },
		],
	},
	{
		id: 'txt_hide',
		category: 'Текст',
		label: 'Скрыть Текст',
		desc: 'Скрывает указанный текстовый элемент.',
		icon: 'ri-eye-off-fill',
		color: '#FFD600',
		inputs: [{ label: 'Имя', default: 'txt1' }],
	},
	{
		id: 'txt_show',
		category: 'Текст',
		label: 'Показать Текст',
		desc: 'Показывает указанный текстовый элемент, если он был скрыт.',
		icon: 'ri-eye-fill',
		color: '#FFD600',
		inputs: [{ label: 'Имя', default: 'txt1' }],
	},
	{
		id: 'txt_load_font',
		category: 'Текст',
		label: 'Загрузить шрифт (URL)',
		desc: 'Подключает шрифт из интернета.',
		icon: 'ri-download-line',
		color: '#FFD600',
		inputs: [
			{ label: 'Имя шрифта', default: 'MyFont' }, // v[0]
			{ label: 'Ссылка (URL)', default: 'https://...' }, // v[1]
		],
	},
	{
		id: 'txt_set_font',
		category: 'Текст',
		label: 'Установить шрифт',
		desc: 'Применяет шрифт к объекту.',
		icon: 'ri-font-family',
		color: '#FFD600',
		inputs: [
			{ label: 'Имя текста', default: 'txt1' }, // v[0]
			{ label: 'Имя шрифта', default: 'MyFont' }, // v[1] (Теперь тут можно писать!)
		],
	},

	// --- ПЕРЕМЕННЫЕ ---
	{
		id: 'var_set',
		category: 'Переменные',
		label: 'Установить перем.',
		desc: 'Устанавливает указанную переменную в заданное значение.',
		icon: 'ri-save-line',
		color: '#D50000',
		inputs: [
			{ label: 'Имя', default: 'score' },
			{ label: 'Значение', default: '0' },
		],
	},
	{
		id: 'var_change',
		category: 'Переменные',
		label: 'Изменить перем.',
		desc: 'Изменяет указанную переменную на заданное значение (прибавляет или вычитает).',
		icon: 'ri-add-circle-line',
		color: '#D50000',
		inputs: [
			{ label: 'Имя', default: 'score' },
			{ label: 'На сколько', default: '1' },
		],
	},
	{
		id: 'log_print',
		category: 'Переменные',
		label: 'Вывести в консоль',
		desc: 'Выводит указанный текст или значение переменной в консоль разработчика.',
		icon: 'ri-terminal-line',
		color: '#D50000',
		inputs: [{ label: 'Текст/Перем.', default: 'Привет' }],
	},
	{
		id: 'var_math',
		category: 'Переменные',
		label: 'Математика',
		desc: 'Выполняет операцию и сохраняет результат.',
		icon: 'ri-calculator-line',
		color: '#D50000',
		inputs: [
			{ label: 'Перем. A', default: 'result' },
			{ label: 'Знач. 1', default: '0' },
			{ label: 'Опер (+ - * / % ^)', default: '+' },
			{ label: 'Знач. 2', default: '1' },
		],
	},
	{
		id: 'var_random',
		category: 'Переменные',
		label: 'Случайное число',
		desc: 'Генерирует число от Мин до Макс.',
		icon: 'ri-shuffle-line',
		color: '#D50000',
		inputs: [
			{ label: 'Результат в', default: 'rnd' },
			{ label: 'Мин', default: '1' },
			{ label: 'Макс', default: '10' },
		],
	},

	// --- ЛОГИКА ---
	{
		id: 'evt_wait',
		category: 'Логика',
		label: 'Ждать (сек)',
		desc: 'Приостанавливает выполнение прикрепленных блоков на указанное количество секунд.',
		icon: 'ri-timer-line',
		color: '#FF6D00',
		inputs: [{ label: 'Секунды', default: '1' }],
	},
	// --- УПРАВЛЕНИЕ ПОТОКОМ (FLOW) ---
	{
		id: 'flow_if',
		category: 'Логика',
		label: 'Если (IF)',
		desc: 'Если условие верно, выполняет блоки внутри. Иначе пропускает их до "Конец блока".',
		icon: 'ri-question-mark',
		color: '#FF6D00',
		inputs: [
			{ label: 'Значение А', default: '1' },
			{ label: 'Опер (> < =)', default: '=' },
			{ label: 'Значение Б', default: '1' },
		],
	},
	{
		id: 'flow_repeat',
		category: 'Логика',
		label: 'Повторить N раз',
		desc: 'Повторяет блоки внутри указанное число раз.',
		icon: 'ri-loop-right-line',
		color: '#FF6D00',
		inputs: [{ label: 'Количество', default: '5' }],
	},
	{
		id: 'flow_end',
		category: 'Логика',
		label: 'Конец блока (End)',
		desc: 'Закрывает If или Цикл.',
		icon: 'ri-arrow-up-double-line',
		color: '#FF6D00',
		inputs: [],
	},

	{
		id: 'flow_else',
		category: 'Логика',
		label: 'Иначе (Else)',
		desc: 'Выполняется, если предыдущий IF был ложным.',
		icon: 'ri-arrow-go-forward-line',
		color: '#FF6D00',
		inputs: [],
	},
	{
		id: 'flow_comment',
		category: 'Логика',
		label: 'Комментарий',
		desc: 'Заметка для разработчика (не выполняется).',
		icon: 'ri-chat-1-line',
		color: '#FF8F00',
		inputs: [{ label: 'Текст', default: 'Тут сложная логика...' }],
	},
	// --- БОЕВАЯ СИСТЕМА ---
	{
		id: 'combat_damage',
		category: 'Логика', // Или новая категория "Бой"
		label: 'Нанести урон',
		desc: 'Уменьшает переменную HP у объекта (компонент).',
		icon: 'ri-sword-fill',
		color: '#FF6D00',
		inputs: [
			{ label: 'Цель (Obj)', default: 'enemy' },
			{ label: 'Кол-во', default: '10' },
			{ label: 'Имя комп. HP', default: 'health' },
		],
	},
	{
		id: 'logic_chance',
		category: 'Логика',
		label: 'Вероятность (%)',
		desc: 'Записывает 1 в переменную, если повезло.',
		icon: 'ri-percent-line',
		color: '#FF6D00',
		inputs: [
			{ label: 'Шанс (0-100)', default: '50' },
			{ label: 'Результат в', default: 'success' },
		],
	},

	// --- 1. УСЛОВИЯ+ (LOGIC) ---
	{
		id: 'logic_obj_exists',
		category: 'Логика',
		label: 'Объект существует?',
		desc: 'Проверяет, есть ли объект на сцене. Пишет 1 или 0.',
		icon: 'ri-question-line',
		color: '#FF6D00',
		inputs: [
			{ label: 'Имя объекта', default: 'enemy1' },
			{ label: 'Результат в', default: 'exists' },
		],
	},
	{
		id: 'logic_is_visible',
		category: 'Логика',
		label: 'Объект видим?',
		desc: 'Проверяет, не скрыт ли объект (display != none).',
		icon: 'ri-eye-line',
		color: '#FF6D00',
		inputs: [
			{ label: 'Имя объекта', default: 'enemy1' },
			{ label: 'Результат в', default: 'is_vis' },
		],
	},

	// --- АНИМАЦИЯ ---
	{
		id: 'anim_move_to',
		category: 'Анимация',
		label: 'Плавное движение',
		desc: 'Плавно перемещает объект к указанным координатам X и Y за заданное время.',
		icon: 'ri-run-line',
		color: '#D500F9',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'X', default: '300' },
			{ label: 'Y', default: '300' },
			{ label: 'Время (сек)', default: '1' },
		],
	},
	{
		id: 'anim_rotate_to',
		category: 'Анимация',
		label: 'Плавный поворот',
		desc: 'Плавно поворачивает объект к указанному углу в градусах за заданное время.',
		icon: 'ri-refresh-line',
		color: '#D500F9',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Угол (град)', default: '180' },
			{ label: 'Время (сек)', default: '1' },
		],
	},
	{
		id: 'anim_scale_to',
		category: 'Анимация',
		label: 'Плавный масштаб',
		desc: 'Плавно изменяет масштаб объекта по осям X и Y за заданное время.',
		icon: 'ri-aspect-ratio-fill',
		color: '#D500F9',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Масштаб X', default: '2' },
			{ label: 'Масштаб Y', default: '2' },
			{ label: 'Время (сек)', default: '1' },
		],
	},
	{
		id: 'anim_fade',
		category: 'Анимация',
		label: 'Плавная прозр.',
		desc: 'Плавно изменяет прозрачность объекта до указанного значения (от 0 до 1) за заданное время.',
		icon: 'ri-drop-fill',
		color: '#D500F9',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Прозр. (0-1)', default: '0' },
			{ label: 'Время (сек)', default: '1' },
		],
	},
	{
		id: 'anim_stop',
		category: 'Анимация',
		label: 'Стоп анимация',
		desc: 'Останавливает все текущие анимации для указанного объекта.',
		icon: 'ri-stop-circle-line',
		color: '#D500F9',
		inputs: [{ label: 'Объект', default: 'box1' }],
	},

	// --- ОТЛАДКА ---
	{
		id: 'debug_draw_bounds',
		category: 'Отладка',
		label: 'Показать границы',
		desc: 'Показывает или скрывает границы (контур) указанного объекта для отладки.',
		icon: 'ri-shape-line',
		color: '#F57C00',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Вкл/Выкл (1/0)', default: '1' },
		],
	},
	{
		id: 'debug_show_fps',
		category: 'Отладка',
		label: 'Показать FPS',
		desc: 'Включает или отключает отображение счетчика кадров в секунду (FPS) на экране.',
		icon: 'ri-speed-line',
		color: '#F57C00',
		inputs: [{ label: 'Вкл/Выкл (1/0)', default: '1' }],
	},
	{
		id: 'debug_pause',
		category: 'Отладка',
		label: 'Пауза игры',
		desc: 'Приостанавливает или возобновляет выполнение игры.',
		icon: 'ri-pause-circle-line',
		color: '#F57C00',
		inputs: [],
	},
	{
		id: 'debug_step',
		category: 'Отладка',
		label: 'Шаг (кадр)',
		desc: 'Выполняет один кадр игры при паузе для поэтапной отладки.',
		icon: 'ri-skip-forward-line',
		color: '#F57C00',
		inputs: [],
	},

	// --- ЗВУК ---
	{
		id: 'snd_load',
		category: 'Звук',
		label: 'Загрузить звук',
		desc: 'Загружает файл по ссылке и дает ему имя',
		icon: 'ri-download-cloud-2-line',
		color: '#ea99ddff',
		inputs: [
			{ name: 'Имя (ID)', type: 'text', default: 'bg_music' }, // v[0]
			{
				name: 'Ссылка/Файл',
				type: 'text',
				default: 'https://example.com/sound.mp3',
			}, // v[1]
		],
	},
	{
		id: 'snd_play',
		category: 'Звук',
		label: 'Проиграть звук',
		desc: 'Играет звук по ID',
		icon: 'ri-play-circle-line',
		color: '#ea99ddff',
		inputs: [
			{ name: 'Имя (ID)', type: 'text', default: 'bg_music' }, // v[0]
		],
	},
	{
		id: 'snd_stop',
		category: 'Звук',
		label: 'Остановить звук',
		desc: 'Останавливает конкретный звук',
		icon: 'ri-stop-circle-line',
		color: '#ea99ddff',
		inputs: [
			{ name: 'Имя (ID)', type: 'text', default: 'bg_music' }, // v[0]
		],
	},
	{
		id: 'snd_loop',
		category: 'Звук',
		label: 'Зациклить звук',
		desc: 'Вкл/Выкл повторение (1 или 0)',
		icon: 'ri-repeat-line',
		color: '#ea99ddff',
		inputs: [
			{ name: 'Имя (ID)', type: 'text', default: 'bg_music' }, // v[0]
			{ name: 'Включить? (1/0)', type: 'text', default: '1' }, // v[1]
		],
	},
	{
		id: 'snd_stop_all',
		category: 'Звук',
		label: 'Остановить все звуки',
		desc: 'Тишина',
		icon: 'ri-volume-mute-line',
		color: '#ea99ddff',
		inputs: [], // Входов нет, просто действие
	},
	{
		id: 'snd_set_volume',
		category: 'Звук',
		label: 'Громкость звука',
		desc: 'Установить громкость (0.0 - 1.0)',
		icon: 'ri-volume-up-line',
		color: '#ea99ddff',
		inputs: [
			{ label: 'ID звука', default: 'bg_music' },
			{ label: 'Громкость', default: '0.5' },
		],
	},

	// --- ИНТЕРФЕЙС (UI) ---
	{
		id: 'ui_panel',
		category: 'Интерфейс',
		label: 'Создать панель',
		desc: 'Фон для меню или статов',
		icon: 'ri-layout-top-line',
		color: '#ff9800',
		inputs: [
			{ name: 'ID', type: 'text', default: 'panel1' },
			{ name: 'X', type: 'number', default: '10' },
			{ name: 'Y', type: 'number', default: '10' },
			{ name: 'Ширина', type: 'number', default: '200' },
			{ name: 'Высота', type: 'number', default: '300' },
			{ name: 'Цвет', type: 'color', default: '#202020' },
		],
	},
	{
		id: 'ui_button_create',
		category: 'Интерфейс',
		label: 'Создать кнопку',
		desc: 'Кнопка, которую можно нажать',
		icon: 'ri-cursor-line',
		color: '#ff9800',
		inputs: [
			{ name: 'ID', type: 'text', default: 'btn_jump' },
			{ name: 'Текст', type: 'text', default: 'ПРЫЖОК' },
			{ name: 'X', type: 'number', default: '650' },
			{ name: 'Y', type: 'number', default: '500' },
			{ name: 'Ширина', type: 'number', default: '120' },
			{ name: 'Высота', type: 'number', default: '50' },
		],
	},
	{
		id: 'ui_button_onclick',
		category: 'Интерфейс',
		label: 'Когда кнопка нажата',
		desc: 'Событие клика по UI кнопке',
		icon: 'ri-cursor-line',
		color: '#fb8c00', // Чуть темнее, так как это событие
		inputs: [{ name: 'ID кнопки', type: 'text', default: 'btn_jump' }],
	},
	{
		id: 'ui_progressbar',
		category: 'Интерфейс',
		label: 'Прогрессбар',
		desc: 'Полоска жизни или загрузки',
		icon: 'ri-loader-3-line',
		color: '#ff9800',
		inputs: [
			{ name: 'ID', type: 'text', default: 'hp_bar' },
			{ name: 'Значение (0-100)', type: 'text', default: '100' },
			{ name: 'X', type: 'number', default: '20' },
			{ name: 'Y', type: 'number', default: '20' },
			{ name: 'Ширина', type: 'number', default: '200' },
			{ name: 'Высота', type: 'number', default: '20' },
		],
	},
	{
		id: 'ui_slider',
		category: 'Интерфейс',
		label: 'Слайдер',
		desc: 'Ползунок. Меняет переменную.',
		icon: 'ri-equalizer-line',
		color: '#ff9800',
		inputs: [
			{ name: 'ID', type: 'text', default: 'vol_slider' },
			{ name: 'Привязать к перем.', type: 'text', default: 'speed' },
			{ name: 'Мин', type: 'number', default: '0' },
			{ name: 'Макс', type: 'number', default: '100' },
			{ name: 'X', type: 'number', default: '20' },
			{ name: 'Y', type: 'number', default: '60' },
		],
	},
	{
		id: 'ui_toggle',
		category: 'Интерфейс',
		label: 'Скрыть/Показать (Toggle)',
		desc: 'Переключает видимость элемента или панели',
		icon: 'ri-eye-close-line',
		color: '#ff9800',
		inputs: [
			{ name: 'ID элемента', type: 'text', default: 'panel1' }, // v[0]
			{
				name: 'Режим',
				type: 'select',
				default: 'toggle',
				options: ['toggle', 'show', 'hide'],
			}, // v[1]
		],
	},
	{
		id: 'ui_anchor',
		category: 'Интерфейс',
		label: 'Привязать к экрану',
		desc: 'Закрепляет объект у края экрана (адаптивно).',
		icon: 'ri-pushpin-2-fill',
		color: '#ff9800',
		inputs: [
			{ label: 'Объект', default: 'hp_bar' },
			{
				label: 'Точка',
				type: 'select',
				default: 'top-left',
				options: [
					'top-left',
					'top-center',
					'top-right',
					'center-left',
					'center',
					'center-right',
					'bottom-left',
					'bottom-center',
					'bottom-right',
					'stretch-full', // Растянуть на весь экран
				],
			},
			{ label: 'Отступ X (px)', default: '20' },
			{ label: 'Отступ Y (px)', default: '20' },
		],
	},

	// --- СЦЕНЫ ---
	{
		id: 'scene_load',
		category: 'Сцены',
		label: 'Загрузить сцену',
		desc: 'Переход на другую сцену по имени',
		icon: 'ri-movie-line',
		color: '#7c4dff',
		inputs: [
			{ name: 'Имя сцены', type: 'text', default: 'Уровень 2' }, // v[0]
		],
	},
	{
		id: 'scene_reload',
		category: 'Сцены',
		label: 'Перезапуск',
		desc: 'Рестарт текущей сцены',
		icon: 'ri-refresh-line',
		color: '#7c4dff',
		inputs: [],
	},
	{
		id: 'scene_next',
		category: 'Сцены',
		label: 'След. сцена',
		desc: 'Переход на следующую по списку',
		icon: 'ri-skip-forward-line',
		color: '#7c4dff',
		inputs: [],
	},
	{
		id: 'scene_save_state',
		category: 'Сцены',
		label: 'Сохранить прогресс',
		desc: 'Сохраняет переменные в слот',
		icon: 'ri-save-2-line',
		color: '#7c4dff',
		inputs: [
			{ name: 'Имя слота', type: 'text', default: 'autosave' }, // v[0]
		],
	},
	{
		id: 'scene_load_state',
		category: 'Сцены',
		label: 'Загрузить прогресс',
		desc: 'Восстанавливает переменные',
		icon: 'ri-upload-2-line',
		color: '#7c4dff',
		inputs: [
			{ name: 'Имя слота', type: 'text', default: 'autosave' }, // v[0]
		],
	},

	// --- ФИЗИКА (BASIC 2D) ---
	{
		id: 'phys_enable',
		category: 'Физика',
		label: 'Вкл. Физику',
		desc: 'Подключает объект к физическому движку (гравитация, скорость).',
		icon: 'ri-basketball-line',
		color: '#00BCD4',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Масса (0=статичный)', default: '1' },
		],
	},
	{
		id: 'phys_set_gravity',
		category: 'Физика',
		label: 'Гравитация мира',
		desc: 'Устанавливает глобальную гравитацию (X, Y).',
		icon: 'ri-arrow-down-double-line',
		color: '#00BCD4',
		inputs: [
			{ label: 'Сила X', default: '0' },
			{ label: 'Сила Y', default: '0.5' },
		],
	},
	{
		id: 'phys_add_force',
		category: 'Физика',
		label: 'Толкнуть (Force)',
		desc: 'Применяет импульс к объекту.',
		icon: 'ri-flight-takeoff-line',
		color: '#00BCD4',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Сила X', default: '0' },
			{ label: 'Сила Y', default: '-10' },
		],
	},
	{
		id: 'phys_set_velocity',
		category: 'Физика',
		label: 'Задать скорость',
		desc: 'Жестко устанавливает скорость движения.',
		icon: 'ri-speed-mini-fill',
		color: '#00BCD4',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'VX', default: '5' },
			{ label: 'VY', default: '0' },
		],
	},
	{
		id: 'phys_set_bounce',
		category: 'Физика',
		label: 'Упругость (Bounce)',
		desc: 'Коэффициент отскока от границ (0...1+).',
		icon: 'ri-ping-pong-line',
		color: '#00BCD4',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Значение', default: '0.7' },
		],
	},
	{
		id: 'phys_collide_world',
		category: 'Физика',
		label: 'Границы мира',
		desc: 'Включает столкновение с краями окна игры.',
		icon: 'ri-layout-line',
		color: '#00BCD4',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Вкл/Выкл (1/0)', default: '1' },
		],
	},

	// --- КАМЕРА ---
	{
		id: 'cam_follow',
		category: 'Камера',
		label: 'Следить за...',
		desc: 'Камера плавно следует за выбранным объектом.',
		icon: 'ri-camera-lens-fill',
		color: '#3F51B5',
		inputs: [
			{ label: 'Объект', default: 'player' },
			{ label: 'Скорость (0-1)', default: '0.1' },
		],
	},
	{
		id: 'cam_set_pos',
		category: 'Камера',
		label: 'Позиция камеры',
		desc: 'Мгновенно перемещает камеру в точку.',
		icon: 'ri-camera-switch-line',
		color: '#3F51B5',
		inputs: [
			{ label: 'X', default: '0' },
			{ label: 'Y', default: '0' },
		],
	},
	{
		id: 'cam_zoom',
		category: 'Камера',
		label: 'Зум камеры',
		desc: 'Приближение или отдаление (1 = норма).',
		icon: 'ri-zoom-in-line',
		color: '#3F51B5',
		inputs: [{ label: 'Масштаб', default: '1' }],
	},
	{
		id: 'cam_shake',
		category: 'Камера',
		label: 'Тряска камеры',
		desc: 'Создает эффект землетрясения.',
		icon: 'ri-pulse-line',
		color: '#3F51B5',
		inputs: [
			{ label: 'Сила', default: '5' },
			{ label: 'Длительность (сек)', default: '0.5' },
		],
	},
	{
		id: 'cam_reset',
		category: 'Камера',
		label: 'Сброс камеры',
		desc: 'Возвращает камеру в начальное положение (0,0).',
		icon: 'ri-restart-line',
		color: '#3F51B5',
		inputs: [],
	},
	{
		id: 'cam_zoom_to',
		category: 'Камера',
		label: 'Плавный зум',
		desc: 'Плавно меняет масштаб камеры.',
		icon: 'ri-zoom-in-line',
		color: '#3F51B5',
		inputs: [
			{ label: 'Зум (1=Норма)', default: '1.5' },
			{ label: 'Время (сек)', default: '1' },
		],
	},

	// --- ДАННЫЕ (SAVE/LOAD) ---
	{
		id: 'data_save',
		category: 'Данные',
		label: 'Сохранить',
		desc: 'Сохраняет значение в память устройства (Local Storage). Останется после перезагрузки.',
		icon: 'ri-save-3-fill',
		color: '#795548',
		inputs: [
			{ label: 'Ключ (имя)', default: 'my_score' },
			{ label: 'Значение', default: '100' },
		],
	},
	{
		id: 'data_load',
		category: 'Данные',
		label: 'Загрузить',
		desc: 'Загружает данные из памяти в переменную.',
		icon: 'ri-download-2-fill',
		color: '#795548',
		inputs: [
			{ label: 'Ключ (имя)', default: 'my_score' },
			{ label: 'В переменную', default: 'score' },
		],
	},
	{
		id: 'data_clear',
		category: 'Данные',
		label: 'Очистить все',
		desc: 'Удаляет все сохраненные данные игры.',
		icon: 'ri-delete-bin-fill',
		color: '#795548',
		inputs: [],
	},

	// --- ВВОД (INPUT) ---
	{
		id: 'input_key_down',
		category: 'Ввод',
		label: 'Клавиша зажата?',
		desc: 'Записывает 1 (да) или 0 (нет) в переменную, если клавиша удерживается.',
		icon: 'ri-keyboard-line',
		color: '#607D8B',
		inputs: [
			{ label: 'Клавиша (Code)', default: 'Space' },
			{ label: 'Результат в', default: 'is_jumping' },
		],
	},
	{
		id: 'input_mouse_pos',
		category: 'Ввод',
		label: 'Позиция мыши',
		desc: 'Записывает X и Y мыши (в мире) в переменные.',
		icon: 'ri-mouse-line',
		color: '#607D8B',
		inputs: [
			{ label: 'Перем. X', default: 'mouse_x' },
			{ label: 'Перем. Y', default: 'mouse_y' },
		],
	},
	{
		id: 'input_touch',
		category: 'Ввод',
		label: 'Касание (Touch)',
		desc: 'Для мобильных. Записывает 1, если палец на экране.',
		icon: 'ri-fingerprint-line',
		color: '#607D8B',
		inputs: [{ label: 'Результат в', default: 'is_touching' }],
	},

	// --- ПРОДВИНУТОЕ ---
	{
		id: 'sys_exec_js',
		category: 'Система',
		label: 'Выполнить JS',
		desc: 'Выполняет произвольный JavaScript код. Доступны: gameVariables, el (объект), scene.',
		icon: 'ri-code-box-line', // Иконка кода
		color: '#607D8B', // Серо-синий цвет как на скрине
		inputs: [
			{
				label: 'Код (JavaScript):',
				type: 'textarea', // Используем наш новый тип
				default: '// gameVariables["score"] += 10;\nconsole.log("Hello!");',
			},
		],
	},

	// --- УПРАВЛЕНИЕ ИГРОЙ ---
	{
		id: 'game_pause',
		category: 'Система',
		label: 'Пауза игры',
		desc: 'Останавливает физику, таймеры и апдейты.',
		icon: 'ri-pause-circle-fill',
		color: '#607D8B',
		inputs: [{ label: 'Вкл/Выкл (1/0)', default: '1' }],
	},
	{
		id: 'game_over_screen',
		category: 'Система',
		label: 'Экран Game Over',
		desc: 'Показывает стандартный экран проигрыша с кнопкой рестарта.',
		icon: 'ri-skull-fill',
		color: '#607D8B',
		inputs: [{ label: 'Заголовок', default: 'GAME OVER' }],
	},
	{
		id: 'game_restart',
		category: 'Система',
		label: 'Перезагрузить игру',
		desc: 'Полный рестарт текущей сцены со сбросом переменных.',
		icon: 'ri-refresh-line',
		color: '#607D8B',
		inputs: [],
	},

	// --- 2. СОСТОЯНИЯ (STATE) ---
	{
		id: 'state_set',
		category: 'Переменные',
		label: 'Задать состояние',
		desc: 'Устанавливает текстовое состояние объекта (например: idle, run).',
		icon: 'ri-price-tag-3-line',
		color: '#D50000',
		inputs: [
			{ label: 'Объект', default: 'player' },
			{ label: 'Состояние', default: 'idle' },
		],
	},
	{
		id: 'state_get',
		category: 'Переменные',
		label: 'Взять состояние',
		desc: 'Записывает текущее состояние объекта в переменную.',
		icon: 'ri-price-tag-3-fill',
		color: '#D50000',
		inputs: [
			{ label: 'Объект', default: 'player' },
			{ label: 'Результат в', default: 'p_state' },
		],
	},

	// --- 3. ТЕГИ (TAGS) ---
	{
		id: 'tag_add',
		category: 'Группы',
		label: 'Добавить тег',
		desc: 'Вешает метку на объект (например: enemy).',
		icon: 'ri-bookmark-line',
		color: '#FF4081',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Тег', default: 'enemy' },
		],
	},
	{
		id: 'tag_check',
		category: 'Группы',
		label: 'Имеет тег?',
		desc: 'Проверяет наличие тега (1 или 0).',
		icon: 'ri-bookmark-fill',
		color: '#FF4081',
		inputs: [
			{ label: 'Объект', default: 'box1' },
			{ label: 'Тег', default: 'enemy' },
			{ label: 'Результат в', default: 'has_tag' },
		],
	},

	// --- 4. ВЗАИМОДЕЙСТВИЕ (INTERACT) ---
	{
		id: 'interact_dist',
		category: 'Логика',
		label: 'Дистанция до...',
		desc: 'Считает расстояние между двумя объектами.',
		icon: 'ri-ruler-line',
		color: '#FF6D00',
		inputs: [
			{ label: 'Объект А', default: 'player' },
			{ label: 'Объект Б', default: 'door' },
			{ label: 'Результат в', default: 'dist' },
		],
	},
	{
		id: 'zone_check',
		category: 'Логика',
		label: 'Внутри зоны?',
		desc: 'Проверяет, находится ли объект внутри другого (зоны).',
		icon: 'ri-shape-2-line',
		color: '#FF6D00',
		inputs: [
			{ label: 'Кто', default: 'player' },
			{ label: 'Зона (Объект)', default: 'zone1' },
			{ label: 'Результат в', default: 'in_zone' },
		],
	},

	// --- 5. AI / ПОВЕДЕНИЕ ---
	{
		id: 'ai_move_to',
		category: 'Движение',
		label: 'Идти к объекту',
		desc: 'Делает шаг в сторону цели (для Update).',
		icon: 'ri-footprint-line',
		color: '#6200EA',
		inputs: [
			{ label: 'Кто', default: 'enemy' },
			{ label: 'Цель', default: 'player' },
			{ label: 'Скорость', default: '2' },
		],
	},
	{
		id: 'ai_flee',
		category: 'Движение',
		label: 'Убегать от',
		desc: 'Делает шаг от цели (для Update).',
		icon: 'ri-run-line',
		color: '#6200EA',
		inputs: [
			{ label: 'Кто', default: 'civilian' },
			{ label: 'От кого', default: 'zombie' },
			{ label: 'Скорость', default: '3' },
		],
	},

	// --- 7. ВВОД (ADVANCED) ---
	{
		id: 'input_axis',
		category: 'Ввод',
		label: 'Ось (Axis)',
		desc: 'Возвращает -1, 0 или 1 в зависимости от нажатых клавиш (напр. A и D).',
		icon: 'ri-gamepad-line',
		color: '#607D8B',
		inputs: [
			{ label: 'Кнопка Минус', default: 'KeyA' },
			{ label: 'Кнопка Плюс', default: 'KeyD' },
			{ label: 'Результат в', default: 'axis_x' },
		],
	},

	// --- 8. ВИЗУАЛ (VFX) ---
	{
		id: 'fx_screen_color',
		category: 'Окно',
		label: 'FX: Цвет экрана',
		desc: 'Накладывает цвет поверх игры (вспышка, затемнение).',
		icon: 'ri-contrast-drop-2-line',
		color: '#00B0FF',
		inputs: [
			{ label: 'Цвет (rgba)', default: 'rgba(255,0,0,0.5)' },
			{ label: 'Время (сек)', default: '0.5' },
		],
	},
	{
		id: 'fx_shake',
		category: 'Окно',
		label: 'FX: Тряска (CSS)',
		desc: 'Трясет указанный объект или UI.',
		icon: 'ri-vibration-line',
		color: '#00B0FF',
		inputs: [
			{ label: 'Объект', default: 'game-stage' },
			{ label: 'Сила (px)', default: '10' },
			{ label: 'Время (сек)', default: '0.5' },
		],
	},

	// --- 10. ПРЕФАБЫ ---
	{
		id: 'obj_spawn_clone',
		category: 'Объекты',
		label: 'Спавн клона',
		desc: 'Создает копию объекта в новых координатах.',
		icon: 'ri-file-copy-2-fill',
		color: '#2979FF',
		inputs: [
			{ label: 'Кого клонировать', default: 'bullet_prefab' },
			{ label: 'Новое имя', default: 'bullet_1' },
			{ label: 'X', default: '100' },
			{ label: 'Y', default: '100' },
		],
	},

	// ==========================================
	// --- КОМПОНЕНТНАЯ СИСТЕМА (ECS) ---
	// ==========================================
	{
		id: 'comp_add',
		category: 'Компоненты',
		label: 'Добавить компонент',
		desc: 'Вешает на объект данные (HP, Damage и т.д.)',
		icon: 'ri-puzzle-2-fill',
		color: '#FF4081',
		inputs: [
			{ label: 'Объект', default: 'player' },
			{ label: 'Имя комп.', default: 'health' },
			{ label: 'Значение', default: '100' },
		],
	},
	{
		id: 'comp_get',
		category: 'Компоненты',
		label: 'Получить компонент',
		desc: 'Читает данные компонента.',
		icon: 'ri-puzzle-2-line',
		color: '#FF4081',
		inputs: [
			{ label: 'Объект', default: 'player' },
			{ label: 'Имя комп.', default: 'health' },
			{ label: 'В переменную', default: 'hp_val' },
		],
	},
	{
		id: 'comp_set',
		category: 'Компоненты',
		label: 'Изменить компонент',
		desc: 'Обновляет значение компонента.',
		icon: 'ri-refresh-line',
		color: '#FF4081',
		inputs: [
			{ label: 'Объект', default: 'player' },
			{ label: 'Имя комп.', default: 'health' },
			{ label: 'Новое знач.', default: '90' },
		],
	},
	{
		id: 'comp_has',
		category: 'Компоненты',
		label: 'Имеет компонент?',
		desc: 'Проверяет наличие (1 или 0).',
		icon: 'ri-question-mark',
		color: '#FF4081',
		inputs: [
			{ label: 'Объект', default: 'player' },
			{ label: 'Имя комп.', default: 'AI' },
			{ label: 'Результат в', default: 'is_bot' },
		],
	},

	// ==========================================
	// --- ДИАЛОГИ И UI ---
	// ==========================================
	{
		id: 'ui_dialog_show',
		category: 'Интерфейс',
		label: 'Показать диалог',
		desc: 'Показывает окно с текстом и именем говорящего.',
		icon: 'ri-message-3-fill',
		color: '#FF9800',
		inputs: [
			{ label: 'Имя', default: 'Незнакомец' },
			{ label: 'Текст', default: 'Привет, путник!' },
			{ label: 'Аватар (URL)', default: '' },
		],
	},
	{
		id: 'ui_dialog_hide',
		category: 'Интерфейс',
		label: 'Скрыть диалог',
		desc: 'Убирает диалоговое окно.',
		icon: 'ri-message-3-line',
		color: '#FF9800',
		inputs: [],
	},

	// ==========================================
	// --- ИНВЕНТАРЬ И ЗАДАНИЯ ---
	// ==========================================
	{
		id: 'inv_add',
		category: 'Инвентарь',
		label: 'Добавить предмет',
		desc: 'Кладет предмет в инвентарь (строка).',
		icon: 'ri-archive-drawer-fill',
		color: '#795548',
		inputs: [{ label: 'ID предмета', default: 'key_red' }],
	},
	{
		id: 'inv_has',
		category: 'Инвентарь',
		label: 'Есть предмет?',
		desc: 'Проверяет наличие предмета.',
		icon: 'ri-search-eye-line',
		color: '#795548',
		inputs: [
			{ label: 'ID предмета', default: 'key_red' },
			{ label: 'Результат в', default: 'has_key' },
		],
	},
	{
		id: 'quest_set',
		category: 'Задания',
		label: 'Этап задания',
		desc: 'Обновляет статус квеста.',
		icon: 'ri-flag-2-fill',
		color: '#FBC02D',
		inputs: [
			{ label: 'ID квеста', default: 'main_quest' },
			{ label: 'Этап (число/текст)', default: '1' },
		],
	},

	// ==========================================
	// --- ВИЗУАЛ (СВЕТ, ЧАСТИЦЫ) ---
	// ==========================================
	{
		id: 'gfx_light_ambient',
		category: 'Графика',
		label: 'Общий свет (Ambient)',
		desc: 'Задает общее затемнение (0.0 - темно, 1.0 - светло).',
		icon: 'ri-sun-fill',
		color: '#9C27B0',
		inputs: [{ label: 'Яркость (0-1)', default: '0.2' }],
	},
	{
		id: 'gfx_light_point',
		category: 'Графика',
		label: 'Источник света',
		desc: 'Создает светящуюся точку на объекте.',
		icon: 'ri-lightbulb-flash-fill',
		color: '#9C27B0',
		inputs: [
			{ label: 'Объект', default: 'player' },
			{ label: 'Цвет', default: '#ffaa00' },
			{ label: 'Радиус (px)', default: '150' },
			{ label: 'Интенс. (0-1)', default: '0.8' },
		],
	},
	{
		id: 'gfx_particles',
		category: 'Графика',
		label: 'Спавн частиц',
		desc: 'Простой взрыв частиц в точке.',
		icon: 'ri-bubble-chart-fill',
		color: '#9C27B0',
		inputs: [
			{ label: 'X', default: '100' },
			{ label: 'Y', default: '100' },
			{ label: 'Цвет', default: '#ff0000' },
			{ label: 'Кол-во', default: '10' },
		],
	},
	{
		id: 'gfx_filter',
		category: 'Графика',
		label: 'Эффект (Glitch/Blur)',
		desc: 'CSS фильтр на весь экран.',
		icon: 'ri-blur-off-fill',
		color: '#9C27B0',
		inputs: [
			{
				label: 'Тип',
				type: 'select',
				default: 'none',
				options: ['none', 'blur', 'grayscale', 'invert', 'sepia', 'contrast'],
			},
			{ label: 'Сила (%)', default: '100' },
		],
	},

	// --- ВИДЕО (НОВАЯ КАТЕГОРИЯ) ---
	{
		id: 'video_load',
		category: 'Видео',
		label: 'Загрузить видео',
		desc: 'Создает видео-слой. Можно использовать для кат-сцен или фона.',
		icon: 'ri-movie-2-line',
		color: '#E91E63',
		inputs: [
			{ label: 'ID видео', default: 'intro_vid' },
			{ label: 'URL / Файл', default: 'assets/video.mp4' },
			{ label: 'Ширина (px/%s)', default: '100%' }, // Поддержка %
			{ label: 'Высота (px/%s)', default: '100%' },
			{ label: 'Z-Index', default: '50' }, // Поверх всего или фон
		],
	},
	{
		id: 'video_control',
		category: 'Видео',
		label: 'Управление видео',
		desc: 'Play, Pause или Stop.',
		icon: 'ri-play-mini-fill',
		color: '#E91E63',
		inputs: [
			{ label: 'ID видео', default: 'intro_vid' },
			{
				label: 'Действие',
				type: 'select',
				default: 'play',
				options: ['play', 'pause', 'stop', 'remove'],
			},
		],
	},
	{
		id: 'video_settings',
		category: 'Видео',
		label: 'Настройки видео',
		desc: 'Звук, повтор, прозрачность.',
		icon: 'ri-settings-4-line',
		color: '#E91E63',
		inputs: [
			{ label: 'ID видео', default: 'intro_vid' },
			{ label: 'Громкость (0-1)', default: '1' },
			{ label: 'Зациклить? (1/0)', default: '0' },
			{ label: 'Прозрачность (0-1)', default: '1' },
		],
	},
	{
		id: 'video_on_end',
		category: 'Видео',
		label: 'Когда видео закончилось',
		desc: 'Событие: запускает цепочку, когда видео доиграло до конца.',
		icon: 'ri-movie-2-fill',
		color: '#E91E63',
		inputs: [{ label: 'ID видео', default: 'intro_vid' }],
	},

	// --- ПОСТ-ПРОЦЕССИНГ (НОВАЯ КАТЕГОРИЯ) ---
	{
		id: 'pp_filter_set',
		category: 'Пост-процесс',
		label: 'Цветокоррекция',
		desc: 'Применяет фильтры к игровому миру (Blur, Grayscale, Contrast и др).',
		icon: 'ri-palette-fill',
		color: '#9C27B0',
		inputs: [
			{
				label: 'Тип',
				type: 'select',
				default: 'grayscale',
				options: [
					'grayscale',
					'sepia',
					'invert',
					'blur',
					'contrast',
					'brightness',
					'saturate',
					'hue-rotate',
				],
			},
			{ label: 'Сила (0-100+)', default: '100' },
		],
	},
	{
		id: 'pp_vignette',
		category: 'Пост-процесс',
		label: 'Виньетка',
		desc: 'Затемнение по краям экрана (атмосфера, хоррор).',
		icon: 'ri-focus-3-line',
		color: '#9C27B0',
		inputs: [
			{ label: 'Включить? (1/0)', default: '1' },
			{ label: 'Сила (0-1)', default: '0.5' },
			{ label: 'Цвет (HEX)', default: '#000000' },
		],
	},
	{
		id: 'pp_crt_effect',
		category: 'Пост-процесс',
		label: 'Эффект CRT (ТВ)',
		desc: 'Добавляет скан-линии старого телевизора.',
		icon: 'ri-tv-line',
		color: '#9C27B0',
		inputs: [
			{ label: 'Включить? (1/0)', default: '1' },
			{ label: 'Прозр. линий (0-1)', default: '0.1' },
		],
	},
	{
		id: 'pp_chromatic',
		category: 'Пост-процесс',
		label: 'Глитч / Сбой',
		desc: 'Эффект хроматической аберрации (сдвиг каналов).',
		icon: 'ri-movie-line',
		color: '#9C27B0',
		inputs: [
			{ label: 'Включить? (1/0)', default: '1' },
			{ label: 'Сила сдвига (px)', default: '2' },
		],
	},
	{
		id: 'pp_bloom_fake',
		category: 'Пост-процесс',
		label: 'Блум (Свечение)',
		desc: 'Делает яркие участки еще ярче (имитация через контраст).',
		icon: 'ri-sun-line',
		color: '#9C27B0',
		inputs: [
			{ label: 'Включить? (1/0)', default: '1' },
			{ label: 'Яркость', default: '1.2' },
		],
	},
	{
		id: 'pp_clear_all',
		category: 'Пост-процесс',
		label: 'Сбросить эффекты',
		desc: 'Удаляет все фильтры и наложения.',
		icon: 'ri-delete-back-2-line',
		color: '#9C27B0',
		inputs: [],
	},
]
