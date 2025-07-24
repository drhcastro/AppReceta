document.addEventListener('DOMContentLoaded', () => {

    // URL de tu Web App de Google Apps Script. ¡REEMPLAZA ESTO!
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFb_8Hf_zNt6P6YKAt6W5hlVLOx5m5cC4kCKnp-DaTYjxkcBcZUmMrhd87bdZqeD3sjA/exec';

    // Elementos del DOM
    const loader = document.getElementById('loader');
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    const loginForm = document.getElementById('login-form');
    const patientCodeInput = document.getElementById('patient-code');
    const mainContent = document.getElementById('main-content');

    // Almacenamiento local de datos del paciente
    let patientData = null;

    // --- MANEJADORES DE EVENTOS PRINCIPALES ---

    // Envío del formulario de login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = patientCodeInput.value.trim();
        if (code) {
            fetchPatientData(code);
        }
    });

    // Clic en los síntomas de alarma
    document.getElementById('alarm-sidebar').addEventListener('change', (e) => {
        if (e.target.classList.contains('symptom') && e.target.checked) {
            const symptom = e.target.value;
            logAlert('Sintoma de Alarma', symptom);
            // Opcional: desmarcar después de un tiempo para evitar envíos múltiples
            setTimeout(() => { e.target.checked = false; }, 2000);
        }
    });
    
    // Botones de acción
    document.getElementById('btn-meet').addEventListener('click', () => window.open('https://meet.google.com/', '_blank')); // URL genérica
    document.getElementById('btn-drive').addEventListener('click', () => window.open(patientData.enlaceExpediente, '_blank'));
    document.getElementById('btn-telegram').addEventListener('click', () => window.open(patientData.enlaceTelegram, '_blank'));
    document.getElementById('btn-payment').addEventListener('click', () => document.getElementById('payment-modal').style.display = 'flex');
    document.getElementById('btn-save-image').addEventListener('click', saveAsImage);

    // Modal de pago
    document.querySelector('.close-button').addEventListener('click', () => document.getElementById('payment-modal').style.display = 'none');
    document.getElementById('copy-clabe').addEventListener('click', copyClabe);


    // --- FUNCIONES DE LÓGICA ---

    // Obtener datos del paciente desde Google Sheets
    async function fetchPatientData(code) {
        showLoader(true);
        try {
            const response = await fetch(`${SCRIPT_URL}?action=getPatientData&code=${code}`);
            if (!response.ok) throw new Error(`Error en la red: ${response.statusText}`);
            
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }
            
            patientData = data;
            renderDashboard();
            loginView.style.display = 'none';
            dashboardView.style.display = 'flex';

        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            showLoader(false);
        }
    }

    // Renderizar el panel principal con los datos del paciente
    function renderDashboard() {
        // Información del header
        document.getElementById('patient-name').textContent = patientData.nombre;
        document.getElementById('patient-dob').textContent = formatDate(patientData.nacimiento);
        document.getElementById('patient-age').textContent = calculateAge(patientData.nacimiento);
        document.getElementById('patient-weight').textContent = patientData.peso;
        document.getElementById('current-date').textContent = formatDate(new Date());
        
        const allergiesEl = document.getElementById('patient-allergies');
        if (patientData.alergias && patientData.alergias.toLowerCase() !== 'negadas') {
            allergiesEl.textContent = `ALERGIAS: ${patientData.alergias}`;
            allergiesEl.style.display = 'block';
        } else {
             allergiesEl.style.display = 'none';
        }
        
        // Diagnóstico
        document.getElementById('patient-diagnosis').textContent = patientData.diagnostico;

        // Renderizar medicamentos
        renderMedications();
    }
    
    // Renderizar la lista de medicamentos
    function renderMedications() {
        const container = document.getElementById('medications-container');
        container.innerHTML = ''; // Limpiar contenedor

        patientData.medicamentos.forEach((med, index) => {
            const medEl = document.createElement('div');
            medEl.className = 'medication';
            
            let statusHTML = '';
            if (med.estado === 'terminado') {
                statusHTML = '<span class="status-icon completed">✓</span>';
            } else if (med.estado === 'suspendido') {
                statusHTML = '<span class="status-icon suspended">✗</span>';
            } else {
                statusHTML = `
                    <div class="treatment-status">
                        <button class="status-btn finish" data-med-index="${index}">Terminé</button>
                        <button class="status-btn suspend" data-med-index="${index}">Suspendí</button>
                    </div>`;
            }

            medEl.innerHTML = `
                <div class="med-header">
                    <h4>${med.nombreGenerico} (${med.nombreComercial})</h4>
                    <span class="med-date">Indicado: ${formatDate(med.fechaIndicacion)}</span>
                </div>
                <div class="med-details">
                    <p><strong>Presentación:</strong> ${med.presentacion}</p>
                    <p><strong>Concentración:</strong> ${med.concentracion}</p>
                    <p><strong>Cantidad:</strong> ${med.cantidad}</p>
                    <p><strong>Vía:</strong> ${med.via}</p>
                    <p><strong>Dosis:</strong> ${med.dosis}</p>
                    <p><strong>Frecuencia:</strong> ${med.frecuencia}</p>
                </div>
                <div class="med-instructions">
                    <p><strong>Indicaciones:</strong> ${med.indicaciones}</p>
                </div>
                <p><strong>Avance (${med.duracion} días):</strong></p>
                <div class="dose-tracker" data-med-index="${index}">
                    ${Array.from({ length: med.duracion }, (_, i) => `
                        <div class="day-selector ${med.progreso[i] === 1 ? 'taken' : ''}" data-day-index="${i}">${i + 1}</div>
                    `).join('')}
                </div>
                ${statusHTML}
            `;
            container.appendChild(medEl);
        });

        // Añadir event listeners a los nuevos elementos
        addMedicationEventListeners();
    }
    
    // Añadir event listeners para los controles de medicamentos
    function addMedicationEventListeners() {
        // Selectores de día
        document.querySelectorAll('.day-selector').forEach(selector => {
            selector.addEventListener('click', handleDaySelection);
        });
        // Botones de estado
        document.querySelectorAll('.status-btn').forEach(button => {
            button.addEventListener('click', handleStatusChange);
        });
    }

    // Manejar selección de día de tratamiento
    function handleDaySelection(e) {
        const medIndex = e.target.parentElement.dataset.medIndex;
        const dayIndex = e.target.dataset.dayIndex;
        const med = patientData.medicamentos[medIndex];
        
        // No permitir cambiar si el tratamiento ya terminó
        if (med.estado !== 'activo') return;

        // Cambiar estado (tomado/no tomado)
        med.progreso[dayIndex] = med.progreso[dayIndex] === 1 ? 0 : 1;
        
        updateMedicationData(); // Enviar actualización a la BD
        e.target.classList.toggle('taken'); // Actualizar UI inmediatamente
    }

    // Manejar cambio de estado del tratamiento (terminado/suspendido)
    function handleStatusChange(e) {
        const medIndex = e.target.dataset.medIndex;
        const newStatus = e.target.classList.contains('finish') ? 'terminado' : 'suspendido';
        const med = patientData.medicamentos[medIndex];
        
        if (med.estado === newStatus) return; // Ya está en este estado
        
        med.estado = newStatus;
        
        updateMedicationData(); // Enviar actualización a la BD
        
        // Registrar alerta
        const alertType = newStatus === 'terminado' ? 'Tratamiento Terminado' : 'Tratamiento Suspendido';
        logAlert(alertType, med.nombreGenerico);

        renderMedications(); // Re-renderizar para mostrar el nuevo estado
    }

    // Función para enviar actualización de medicamentos a Google Sheets
    function updateMedicationData() {
        const payload = {
            action: 'updateMedications',
            code: patientData.codigo,
            medications: JSON.stringify(patientData.medicamentos)
        };
        postData(payload);
    }
    
    // Función para registrar una alerta en Google Sheets
    function logAlert(type, detail) {
        const payload = {
            action: 'logAlert',
            code: patientData.codigo,
            alertType: type,
            detail: detail
        };
        postData(payload);
        // Opcional: mostrar una confirmación visual al usuario
        showToast(`Alerta enviada: ${detail}`);
    }

    // Función genérica para enviar datos (POST) a Google Apps Script
    async function postData(payload) {
        try {
            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Error al enviar datos:', error);
            alert('No se pudo guardar el cambio. Revisa tu conexión a internet.');
        }
    }


    // --- FUNCIONES AUXILIARES ---

    function showLoader(show) {
        loader.style.display = show ? 'flex' : 'none';
    }

    function calculateAge(dobString) {
        const birthDate = new Date(dobString);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        let days = today.getDate() - birthDate.getDate();
        if (days < 0) {
            months--;
            days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
        }
        if (months < 0) {
            years--;
            months += 12;
        }
        return `${years} años, ${months} meses y ${days} días`;
    }

    function formatDate(date) {
        return new Date(date).toLocaleDateString('es-MX', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    
    function copyClabe() {
        const clabeInput = document.getElementById('clabe-number');
        clabeInput.select();
        clabeInput.setSelectionRange(0, 99999); // Para móviles
        navigator.clipboard.writeText(clabeInput.value).then(() => {
            showToast('¡CLABE copiada al portapapeles!');
        }, () => {
            showToast('Error al copiar. Por favor, hazlo manualmente.');
        });
    }

    function saveAsImage() {
        showLoader(true);
        const elementToCapture = document.getElementById('main-content');
        html2canvas(elementToCapture, {
            useCORS: true, // Necesario para cargar imágenes de otros dominios
            scale: 2 // Mejora la calidad de la imagen
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Avance-AppReceta-${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showLoader(false);
        }).catch(err => {
            console.error('Error al generar la imagen:', err);
            alert('No se pudo generar la imagen.');
            showLoader(false);
        });
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        // Añade la clase para mostrarlo
        setTimeout(() => toast.classList.add('show'), 10);
        // Oculta y elimina el toast después de 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 500);
        }, 3000);
    }
    
    // CSS para el Toast (añadido dinámicamente)
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: #fff;
            padding: 12px 20px;
            border-radius: 25px;
            z-index: 1001;
            opacity: 0;
            transition: opacity 0.5s, bottom 0.5s;
        }
        .toast.show {
            opacity: 1;
            bottom: 30px;
        }
    `;
    document.head.appendChild(style);


    // --- INICIALIZACIÓN DE LA APP ---

    // Service Worker para PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('ServiceWorker registrado con éxito: ', registration.scope);
            }, err => {
                console.log('Fallo en el registro de ServiceWorker: ', err);
            });
        });
    }
});