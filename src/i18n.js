// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  es: {
    translation: {
      header: {
        online: "ONLINE",
        offline: "OFFLINE",
        connected: "Sistema Conectado",
        disconnected: "Desconectado",
        lightMode: "Modo Claro",
        darkMode: "Modo Oscuro",
        battery: "Batería",
        energyDetail: "Detalle de Energía",
      },
      sidebar: {
        menu: "Menú",
        profile: "Mi Perfil",
        home: "Inicio",
        remoteControl: "Control Remoto",
        data: "Datos",
        camera: "Cámara",
        history: "Historial",
        userManagement: "Gestión de Usuarios",
        logout: "Cerrar Sesión",
      },
      dashboard: {
        title: "Panel General",
      },
      login: {
        welcome: "Bienvenido",
        username: "Nombre de Usuario",
        pwdText: "Contraseña",
        submit: "Entrar",
        errorRequired: "Por favor, introduce nombre y contraseña",
        invalidCreds: "Credenciales inválidas"
      },
      profile: {
        title: "Mi Perfil",
        errorLoadProfile: "No se pudieron cargar los datos del usuario.",
        errorMismatch: "Las contraseñas nuevas no coinciden.",
        errorShort: "La nueva contraseña es demasiado corta.",
        successUpdate: "¡Contraseña actualizada con éxito!",
        errorServer: "Error al conectar con el servidor.",
        comingSoon: "Próximamente",
        changePhotoBtn: "Cambiar Foto (URL)",
        name: "Nombre:",
        loading: "Cargando...",
        role: "Rol:",
        security: "Seguridad",
        currentPassword: "Contraseña Actual",
        newPassword: "Nueva Contraseña",
        confirmPassword: "Confirmar Nueva Contraseña",
        saving: "Guardando...",
        updatePassword: "Actualizar Contraseña"
      },
      control: {
        drivingMode: "Modo de Conducción",
        auto: "AUTO",
        manual: "MANUAL",
        speedLimit: "Límite de Velocidad",
        rearmSystem: "⚠️ REARMAR SISTEMA ⚠️",
        emergencyStop: "🛑 PARADA DE EMERGENCIA 🛑",
        polygonError: "El polígono no puede cruzarse a sí mismo.",
        loadingGPS: "Cargando GPS...",
        centerRobot: "Centrar en el robot",
        heading: "Rumbo",
        queuePoint: "Punto en cola",
        currentTarget: "Destino Actual",
        area: "Área"
      },
            data: {
        title: "Monitor Avanzado",
        subtitle: "Análisis multi-variable en tiempo real.",
        individualAnalysis: "Análisis Individual",
        comparativeAnalysis: "Comparativa de Variables",
        recordsTable: "Tabla de Registros",
        time: "Hora",
        location: "Ubicación",
        humidity: "Humedad (%)",
        temp: "Temp. (°C)",
        ph: "pH",
        npk: "N-P-K",
        solarRad: "Rad. Solar",
        waitingData: "Esperando datos...",
        page: "Página",
        of: "de",
        records: "registros"
      },
      history: {
        title: "Historial de Datos",
        description: "Aquí se mostrarán los registros y eventos pasados."
      },
      chart: {
        climateSoil: "Clima & Suelo",
        humidity: "💧 Humedad",
        temp: "🌡️ Temperatura",
        ph: "🧪 pH",
        solarRad: "☀️ Rad. Solar",
        nutrients: "Nutrientes (NPK)",
        nitrogen: "🔵 Nitrógeno (N)",
        phosphorus: "🟡 Fósforo (P)",
        potassium: "🟣 Potasio (K)",
        range: "Rango:",
        all: "Todo",
        noData: "Sin datos en este rango",
        time: "Tiempo",
        humidityLabel: "Humedad (%)",
        tempLabel: "Temp. (°C)",
        phLabel: "pH",
        nitrogenLabel: "Nitrógeno (N)",
        phosphorusLabel: "Fósforo (P)",
        potassiumLabel: "Potasio (K)",
        solarRadLabel: "Rad. Solar"
      },
      camera: {
        feed: "CAM 1 FEED"
      },
      users: {
        title: "Gestión de Usuarios",
        createNew: "+ Crear Nuevo Usuario",
        edit: "Editar",
        delete: "Eliminar",
        editUser: "Editar Usuario",
        createUser: "Crear Usuario",
        name: "Nombre",
        password: "Contraseña",
        passwordPlaceholder: "(Dejar vacío para no cambiar)",
        role: "Rol",
        roleUser: "Usuario",
        roleOperator: "Operador",
        roleAdmin: "Admin",
        cancel: "Cancelar",
        save: "Guardar",
        errorLoad: "No se pudieron cargar los usuarios.",
        updated: "Usuario actualizado correctamente:",
        pwdRequired: "La contraseña es obligatoria para crear usuarios.",
        created: "Usuario creado con éxito:",
        errorSave: "Error al guardar el usuario.",
        confirmDelete: "¿Estás seguro de que quieres eliminar este usuario?",
        deleted: "Usuario eliminado correctamente",
        errorDelete: "Error al eliminar el usuario."
      },
      battery: {
        title: "Estado de la Batería",
        level: "Nivel",
        status: "Estado",
        voltage: "Voltaje",
        temperature: "Temperatura",
        health: "Salud",
        charging: "Cargando...",
        discharging: "Descargando..."
      },
      map: {
        coverage: "Cobertura",
        loading: "Cargando mapa...",
        setSafeZone: "Fijar Zona Segura",
        cancelZone: "Cancelar Zona",
        zoneSaved: "Guardar Zona",
        safeZoneActive: "Zona Segura Activa",
        editMode: "Modo Edición: Dibuja un polígono en el mapa",
        robot: "AgriRobot",
        target: "Destino Actual"
      },
      energy: {
        title: "Gestión de Energía",
        subtitle: "Estado detallado del sistema eléctrico.",
        batteryStatus: "Estado de la Batería",
        charging: "Cargando",
        inUse: "En uso",
        currentCharge: "Carga Actual",
        generalStatus: "Estado General",
        health: "Salud",
        temperature: "Temperatura",
        chargeCycles: "Ciclos de Carga",
        realTimeConsumption: "Consumo en Tiempo Real",
        tractionMotors: "Motores Tracción",
        navSystem: "Sistema Navegación",
        sensorsCamera: "Sensores y Cámara"
      },
      modal: {
        close: "Cerrar modal"
      },
      mapAdv: {
        drawInstructions: "Haz clic para añadir vértices. Clic en el punto rojo para cerrar.",
        drawCancelled: "Delimitación cancelada.",
        areaDelimited: "Área delimitada.",
        limitsRemoved: "Límites eliminados.",
        layerSatellite: "Satélite",
        layerStreets: "Calles",
        selectHeatmap: "Seleccionar Mapa de Calor",
        layerOff: "🗺️ Capa: Desactivada",
        layerHum: "💧 Capa: Humedad",
        layerPh: "🧪 Capa: pH",
        layerTemp: "🌡️ Capa: Temperatura",
        viewData: "👁️ Ver Datos",
        hideData: "👁️ Ocultar Datos",
        clearLimit: "Borrar Límite",
        clear: "Borrar",
        drawArea: "Delimitar Área",
        areaSummary: "Resumen de Área",
        avgPh: "pH Promedio",
        humidity: "Humedad",
        temp: "Temp.",
        avgNutrients: "Nutrientes (Promedio)",
        samplesAnalyzed: "muestras analizadas",
        sample: "Muestra",
        detail: "Detalle",
        soil: "Suelo",
        rad: "Rad"
      },
      notifications: {
        connectionSuccess: "Conexión establecida con el robot",
        emergencyActive: "SISTEMA BLOQUEADO: Parada de emergencia activada",
        systemReady: "Sistema rearmado y operativo",
        batteryLow: "Batería baja (20%). Dirija al robot al punto de carga",
        updateSuccess: "Actualización realizada con éxito",
        deleteSuccess: "Eliminado correctamente"
      }
    }
  },
  en: {
    translation: {
      header: {
        online: "ONLINE",
        offline: "OFFLINE",
        connected: "System Connected",
        disconnected: "Disconnected",
        lightMode: "Light Mode",
        darkMode: "Dark Mode",
        battery: "Battery",
        energyDetail: "Energy Detail",
      },
      sidebar: {
        menu: "Menu",
        profile: "My Profile",
        home: "Home",
        remoteControl: "Remote Control",
        data: "Data",
        camera: "Camera",
        history: "History",
        userManagement: "User Management",
        logout: "Logout",
      },
      dashboard: {
        title: "Main Dashboard",
      },
      login: {
        welcome: "Welcome",
        username: "Username",
        pwdText: "Password",
        submit: "Login",
        errorRequired: "Please enter username and password",
        invalidCreds: "Invalid credentials"
      },
      profile: {
        title: "My Profile",
        errorLoadProfile: "Could not load user data.",
        errorMismatch: "New passwords do not match.",
        errorShort: "The new password is too short.",
        successUpdate: "Password updated successfully!",
        errorServer: "Error connecting to the server.",
        comingSoon: "Coming soon",
        changePhotoBtn: "Change Photo (URL)",
        name: "Name:",
        loading: "Loading...",
        role: "Role:",
        security: "Security",
        currentPassword: "Current Password",
        newPassword: "New Password",
        confirmPassword: "Confirm New Password",
        saving: "Saving...",
        updatePassword: "Update Password"
      },
      control: {
        drivingMode: "Driving Mode",
        auto: "AUTO",
        manual: "MANUAL",
        speedLimit: "Speed Limit",
        rearmSystem: "⚠️ REARM SYSTEM ⚠️",
        emergencyStop: "🛑 EMERGENCY STOP 🛑",
        polygonError: "The polygon cannot intersect itself.",
        loadingGPS: "Loading GPS...",
        centerRobot: "Center on robot",
        heading: "Heading",
        queuePoint: "Queued point",
        currentTarget: "Current Target",
        area: "Area"
      },
      data: {
        title: "Advanced Monitor",
        subtitle: "Real-time multi-variable analysis.",
        individualAnalysis: "Individual Analysis",
        comparativeAnalysis: "Variables Comparison",
        recordsTable: "Records Table",
        time: "Time",
        location: "Location",
        humidity: "Humidity (%)",
        temp: "Temp. (°C)",
        ph: "pH",
        npk: "N-P-K",
        solarRad: "Solar Rad.",
        waitingData: "Waiting for data...",
        page: "Page",
        of: "of",
        records: "records"
      },
      history: {
        title: "Data History",
        description: "Past records and events will be displayed here."
      },
      chart: {
        climateSoil: "Climate & Soil",
        humidity: "💧 Humidity",
        temp: "🌡️ Temperature",
        ph: "🧪 pH",
        solarRad: "☀️ Solar Rad.",
        nutrients: "Nutrients (NPK)",
        nitrogen: "🔵 Nitrogen (N)",
        phosphorus: "🟡 Phosphorus (P)",
        potassium: "🟣 Potassium (K)",
        range: "Range:",
        all: "All",
        noData: "No data in this range",
        time: "Time",
        humidityLabel: "Humidity (%)",
        tempLabel: "Temp. (°C)",
        phLabel: "pH",
        nitrogenLabel: "Nitrogen (N)",
        phosphorusLabel: "Phosphorus (P)",
        potassiumLabel: "Potassium (K)",
        solarRadLabel: "Solar Rad."
      },
      camera: {
        feed: "CAM 1 FEED"
      },
      users: {
        title: "User Management",
        createNew: "+ Create New User",
        edit: "Edit",
        delete: "Delete",
        editUser: "Edit User",
        createUser: "Create User",
        name: "Name",
        password: "Password",
        passwordPlaceholder: "(Leave blank to keep current)",
        role: "Role",
        roleUser: "User",
        roleOperator: "Operator",
        roleAdmin: "Admin",
        cancel: "Cancel",
        save: "Save",
        errorLoad: "Could not load users.",
        updated: "User updated successfully:",
        pwdRequired: "Password is required to create users.",
        created: "User created successfully:",
        errorSave: "Error saving user.",
        confirmDelete: "Are you sure you want to delete this user?",
        deleted: "User deleted successfully",
        errorDelete: "Error deleting user."
      },
      battery: {
        title: "Battery Status",
        level: "Level",
        status: "Status",
        voltage: "Voltage",
        temperature: "Temperature",
        health: "Health",
        charging: "Charging...",
        discharging: "Discharging..."
      },
      map: {
        coverage: "Coverage",
        loading: "Loading map...",
        setSafeZone: "Set Safe Zone",
        cancelZone: "Cancel Zone",
        zoneSaved: "Save Zone",
        safeZoneActive: "Safe Zone Active",
        editMode: "Edit Mode: Draw a polygon on the map",
        robot: "AgriRobot",
        target: "Current Target"
      },
      energy: {
        title: "Energy Management",
        subtitle: "Detailed electrical system status.",
        batteryStatus: "Battery Status",
        charging: "Charging",
        inUse: "In use",
        currentCharge: "Current Charge",
        generalStatus: "General Status",
        health: "Health",
        temperature: "Temperature",
        chargeCycles: "Charge Cycles",
        realTimeConsumption: "Real-Time Consumption",
        tractionMotors: "Traction Motors",
        navSystem: "Navigation System",
        sensorsCamera: "Sensors & Camera"
      },
      modal: {
        close: "Close modal"
      },
      mapAdv: {
        drawInstructions: "Click to add vertices. Click the red point to close.",
        drawCancelled: "Delimitation cancelled.",
        areaDelimited: "Area delimited.",
        limitsRemoved: "Limits removed.",
        layerSatellite: "Satellite",
        layerStreets: "Streets",
        selectHeatmap: "Select Heatmap",
        layerOff: "🗺️ Layer: Off",
        layerHum: "💧 Layer: Humidity",
        layerPh: "🧪 Layer: pH",
        layerTemp: "🌡️ Layer: Temperature",
        viewData: "👁️ View Data",
        hideData: "👁️ Hide Data",
        clearLimit: "Clear Limit",
        clear: "Clear",
        drawArea: "Delimit Area",
        areaSummary: "Area Summary",
        avgPh: "Avg pH",
        humidity: "Humidity",
        temp: "Temp.",
        avgNutrients: "Nutrients (Average)",
        samplesAnalyzed: "samples analyzed",
        sample: "Sample",
        detail: "Detail",
        soil: "Soil",
        rad: "Rad"
      },
      notifications: {
        connectionSuccess: "Connection established with the robot",
        emergencyActive: "SYSTEM LOCKED: Emergency stop activated",
        systemReady: "System rearmed and operational",
        batteryLow: "Low Battery (20%). Please drive the robot to a charging point",
        updateSuccess: "Update successful",
        deleteSuccess: "Deleted successfully"
      },
    }
  }
};

const savedLanguage = localStorage.getItem("appLanguage") || "es";

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: "es",
    interpolation: {
      escapeValue: false 
    }
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem("appLanguage", lng);
});

export default i18n;