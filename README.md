# 🚗 Vehicle Stock Control

Un sistema ágil de auditoría de flotas diseñado para validar el stock físico de vehículos en campo, garantizando la integridad y precisión de los datos mediante un control de agentes por invitación y geolocalización.

![Dashboard Overview](https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/OverviewTab.png)

---

### El Reto: ¿Dónde está *realmente* mi flota?

En la gestión de flotas, el GPS y los sistemas digitales no siempre cuentan toda la historia. Un sistema puede indicar que un vehículo está en el parking A, pero físicamente está en el B (o no está).

Esta discrepancia genera dos problemas de negocio:
1.  **Errores de Ubicación:** Decisiones logísticas (como enviar un conductor) se toman con datos incorrectos.
2.  **Gestión de Capacidad:** Es imposible saber la ocupación real de un parking, impidiendo optimizar el envío de nuevas unidades.

### La Solución: Un Sistema Integral de Auditoría con 2 Perfiles

**Vehicle Stock Control** es un prototipo funcional que ataca este reto con un enfoque en la seguridad y la usabilidad de los datos.

---

### 1. Perfil de Administrador (El Centro de Control)

El Admin tiene una vista de 360° de toda la operación, diseñada para la gestión y el análisis de datos.

* **Dashboard "Overview":** Una vista de 10 segundos con los KPIs clave: scans totales, scans de hoy, sesiones activas, agentes activos y un feed de actividad en vivo.
* **Gestión de Usuarios:** Control total sobre quién accede a la app. Incluye creación/revocación de **códigos de invitación**, activación/desactivación de agentes y asignación de roles.
* **Gestión de Localizaciones:** Permite crear, editar y filtrar parkings o zonas. Se puede configurar la **capacidad (en m² y en unidades)** y su estado (Activo/Inactivo).
* **Log de Auditoría "All Scan Data":** Un registro inmutable de cada VIN escaneado, detallando hora, Session ID, VIN, localización, agente y método de captura.
* **Exportación de Datos:** Todos los logs y datos se pueden **exportar a .csv** para cruzarlos con sistemas internos (ERP, TMS) e identificar discrepancias.

### 2. Perfil de Agente (La Verificación en Campo)

Una interfaz "Mobile-First" diseñada para ser rápida, precisa y segura.

* **Alta Segura por Invitación:** Los agentes solo pueden crear una cuenta si poseen un código de invitación válido generado por un Admin.
* **Sistema de Sesiones:** El agente debe seleccionar la localización donde se encuentra (de la lista creada por el Admin) antes de empezar.
* **Geolocalización Obligatoria:** La app **requiere acceso a la geolocalización** del dispositivo para añadir una capa crucial de verificación a cada registro.
* **Múltiples Métodos de Entrada:**
    * **Escáner de Cámara:** Reconoce el VIN directamente (ver `CamScannerScreen.jpg`).
    * **Manual:** Ingreso de 17 dígitos con validación.
    * **Upload/Video:** Carga de archivos para registro.
* **Validación Anti-Duplicados:** El sistema avisa y **previene el registro del mismo VIN dos veces** dentro de la misma sesión.
* **Revisión de Sesión:** El agente puede ver un listado de los VINs que ha registrado y **exportar su sesión a CSV** desde el móvil.

---

### 📊 Galería de la Aplicación

<table>
  <tr>
    <td align="center"><strong>Admin: Overview</strong><br>Vista de 10 segundos de la operación.</td>
    <td align="center"><strong>Admin: Gestión de Usuarios</strong><br>Control de agentes y códigos de invitación.</td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/OverviewTab.png" alt="Dashboard Overview"></td>
    <td><img src="https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/UserManagementTab.png" alt="User Management"></td>
  </tr>
  <tr>
    <td align="center"><strong>Admin: Gestión de Localizaciones</strong><br>Configuración de capacidad y estado.</td>
    <td align="center"><strong>Admin: Log de Todos los Scans</strong><br>Auditoría completa de cada registro.</td>
  </tr>
  <tr>
    <td><img src="https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/LocationsTab.png" alt="Locations Management"></td>
    <td><img src="https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/AllScanDataTab.png" alt="All Scan Data Log"></td>
  </tr>
  <tr>
    <td align="center"><strong>Agente: Login y Selección</strong><br>Inicio de sesión y elección de parking.</td>
    <td align="center"><strong>Agente: Escáner de Cámara</strong><br>Reconocimiento de VIN en acción.</td>
  </tr>
  <tr>
    <td align="center">
      <img src="https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/LogInScreen.png" alt="Agent Login" width="45%">
      <img src="https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/LocationSelectorScreen.png" alt="Agent Parking Selection" width="45%">
    </td>
    <td><img src="https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/CamScannerScreen.png" alt="Agent Camera Scanner"></td>
  </tr>
  <tr>
    <td align="center"><strong>Agente: Entrada Manual</strong><br>Alternativa de ingreso de 17 dígitos.</td>
    <td align="center"><strong>Agente: Resumen de Sesión</strong><br>Revisión y exportación de sesión a CSV.</td>
  </tr>
    <tr>
    <td><img src="https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/ManualIntroScreen.png" alt="Agent Manual Entry"></td>
    <td><img src="https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/SessionSummaryScreen.png" alt="Agent Session Summary"></td>
  </tr>
</table>

---

### 🛠️ Stack Tecnológico y Metodología

* **Lógica de la Aplicación:** Construida con **Google AI Studio (Gemini)** para generar la funcionalidad de los perfiles, la gestión de sesiones, la lógica de validación y las interacciones de la base de datos.
* **Entorno de Ejecución:** **Node.js**
* **Frontend:** **React.js (construido con Vite)**
* **Enfoque:** Demostrar cómo se puede pasar de una idea a un prototipo funcional (MVP) de alta fidelidad en tiempo récord.

### 🚀 Cómo Usar este Proyecto (Run Locally)

Para proteger las API Keys, este proyecto está diseñado para ejecutarse localmente.

#### Prerrequisitos
* **Node.js** (v18 o superior recomendado)
* **Git** (para clonar el repositorio)

#### Pasos de Instalación

1.  Clona este repositorio en tu máquina:
    ```bash
    git clone https://github.com/goyoaga/VehicleStockControl.git
    cd VehicleStockControl
    ```

2.  Instala todas las dependencias del proyecto:
    ```bash
    npm install
    ```

3.  Configura tu API Key de Gemini:
    * Crea un archivo llamado `.env.local` en la raíz del proyecto.
    * Añade tu API Key dentro de ese archivo, así:
    ```
    GEMINI_API_KEY=TU_API_KEY_VA_AQUI
    ```

4.  Ejecuta la aplicación en modo de desarrollo:
    ```bash
    npm run dev
    ```

5.  ¡Listo! Abre `http://localhost:3000` (o el puerto que te indique la terminal) en tu navegador para ver la aplicación.

#### Credenciales de Demo

La aplicación incluye dos usuarios de prueba para un testing inmediato, como se ve en la pantalla de Login. Una vez dentro, puedes crear, desactivar o modificar los usuarios que quieras desde el panel de Admin.

![Pantalla de Login con credenciales demo](https://raw.githubusercontent.com/goyoaga/VehicleStockControl/main/images/LogInScreen.png)

* **Usuario Admin:**
    * **Email:** `admin@admin.com`
    * **Contraseña:** `admin`
* **Usuario Agente:**
    * **Email:** `agent@agent@agent.com`
    * **Contraseña:** `agent`

---
*Este proyecto es un prototipo y no utiliza datos reales ni está afiliado a ninguna empresa. Todos los datos para pruebas (VINs, usuarios) son ficticios.*
