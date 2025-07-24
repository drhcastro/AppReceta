document.addEventListener('DOMContentLoaded', () => {

    // URL de tu Web App de Google Apps Script.
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxhn7iZtecPB1vqMYQ2Z6tBLBJkBaF4YVLZeVE65x2-NDtwhApeeoppc2BGWe5E2sSWmg/exec';' // ¡ASEGÚRATE DE QUE ESTA URL SEA LA CORRECTA!

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
            // CORRECCIÓN: Se pasa el tipo de alerta y el detalle a la función logAlert.
            logAlert('Síntoma de Alarma', symptom);
            // Opcional: desmarcar después de un tiempo para evitar envíos múltiples
            setTimeout(() => { e.target.checked = false; }, 2000);
        }
    });
    
    // Botones de acción
    document.getElementById('btn-meet').addEventListener('click', () => {
         // Antes de abrir, nos aseguramos que patientData existe
        if (patientData && patientData.codigo) {
            logAlert('Solicitud de Cita', 'El paciente hizo clic en el botón de Videoconsulta');
        }
        window.open('https://meet.google.com/', '_blank');
    });
    document.getElementById('btn-drive').addEventListener('click', () => {
        if (patientData && patientData.enlaceExpediente) {
            window.open(patientData.enlaceExpediente, '_blank');
        } else {
            alert('No hay un enlace de expediente configurado.');
        }
    });
    document.getElementById('btn-telegram').addEventListener('click', () => {
        if (patientData && patientData.enlaceTelegram) {
            window.open(patientData.enlaceTelegram, '_blank');
        } else {
            alert('No hay un enlace de Telegram configurado.');
        }
    });
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
        document.getElementById('patient-name').textContent = patientData.nombre;
        document.getElementById('patient-dob').textContent = formatDate(patientData.nacimiento);
        document.getElementById('patient-age').textContent = calculateAge(patientData.nacimiento);
        document.getElementById('patient-weight').textContent = patientData.peso;
        document.getElementById('current-date').textContent = formatDate(new Date());
        
        const allergiesEl = document.getElementById('patient-allergies');
        if (patientData.alergias && patientData.alergias.toLowerCase() !== 'negadas' && patientData.alergias.trim() !== '') {
            allergiesEl.textContent = `ALERGIAS: ${patientData.alergias}`;
            allergiesEl.style.display = 'block';
        } else {
             allergiesEl.style.display = 'none';
        }
        
        document.getElementById('patient-diagnosis').textContent = patientData.diagnostico;
        renderMedications();
    }
    
    // Renderizar la lista de medicamentos
    function renderMedications() {
        const container = document.getElementById('medications-container');
        container.innerHTML = '';

        if (!patientData.medicamentos || patientData.medicamentos.length === 0) {
            container.innerHTML = '<p>No hay medicamentos indicados actualmente.</p>';
            return;
        }

        patientData.medicamentos.forEach((med, index) => {
            const medEl = document.createElement('div');
            medEl.className = 'medication';
            
            let statusHTML = '';
            if (med.estado === 'terminado') {
                statusHTML = '<span class="status-icon completed">✓ Tratamiento Terminado</span>';
            } else if (med.estado === 'suspendido') {
                statusHTML = '<span class="status-icon suspended">✗ Tratamiento Suspendido</span>';
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

        addMedicationEventListeners();
    }
    
    function addMedicationEventListeners() {
        document.querySelectorAll('.day-selector').forEach(selector => {
            selector.addEventListener('click', handleDaySelection);
        });
        document.querySelectorAll('.status-btn').forEach(button => {
            button.addEventListener('click', handleStatusChange);
        });
    }

    function handleDaySelection(e) {
        const medIndex = e.target.parentElement.dataset.medIndex;
        const dayIndex = e.target.dataset.dayIndex;
        const med = patientData.medicamentos[medIndex];
        
        if (med.estado !== 'activo') return;

        med.progreso[dayIndex] = med.progreso[dayIndex] === 1 ? 0 : 1;
        
        updateMedicationData();
        e.target.classList.toggle('taken');
    }

    function handleStatusChange(e) {
        const medIndex = e.target.dataset.medIndex;
        const newStatus = e.target.classList.contains('finish') ? 'terminado' : 'suspendido';
        const med = patientData.medicamentos[medIndex];
        
        if (med.estado === newStatus) return;
        
        med.estado = newStatus;
        
        updateMedicationData();
        
        const alertType = newStatus === 'terminado' ? 'Tratamiento Terminado' : 'Tratamiento Suspendido';
        logAlert(alertType, med.nombreGenerico);

        renderMedications();
    }

    function updateMedicationData() {
        // CORRECCIÓN: Asegurarse de que patientData existe antes de enviar
        if (!patientData || !patientData.codigo) {
            console.error("No se pueden actualizar los datos del medicamento: datos del paciente no cargados.");
            return;
        }
        const payload = {
            action: 'updateMedications',
            code: patientData.codigo,
            medications: JSON.stringify(patientData.medicamentos)
        };
        postData(payload);
    }
    
    function logAlert(type, detail) {
        // CORRECCIÓN: La verificación más importante está aquí.
        // Si no hay datos del paciente, no se puede registrar la alerta.
        if (!patientData || !patientData.codigo) {
            console.error("No se puede registrar la alerta: datos del paciente no cargados.");
            // Opcional: informar al usuario que debe iniciar sesión primero.
            alert("Por favor, inicie sesión para registrar una alerta.");
            return;
        }
        const payload = {
            action: 'logAlert',
            code: patientData.codigo,
            alertType: type,
            detail: detail
        };
        postData(payload);
        showToast(`Alerta enviada: ${detail}`);
    }

    async function postData(payload) {
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors', // Necesario para peticiones entre diferentes dominios (GitHub -> Google)
                redirect: 'follow',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' }
            });
             if (!response.ok) {
                throw new Error(`Error en la respuesta del servidor: ${response.statusText}`);
            }
            console.log('Datos enviados con éxito:', payload.action);
        } catch (error) {
            console.error('Error al enviar datos:', error);
            // Este es el mensaje que el usuario ve
            alert('No se pudo guardar el cambio. Revisa tu conexión a internet.');
        }
    }

    // --- FUNCIONES AUXILIARES ---

    function showLoader(show) {
        loader.style.display = show ? 'flex' : 'none';
    }

    function calculateAge(dobString) {
        if (!dobString) return "N/A";
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

    function formatDate(dateString) {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('es-MX', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    
    function copyClabe() {
        const clabeInput = document.getElementById('clabe-number');
        clabeInput.select();
        clabeInput.setSelectionRange(0, 99999);
        try {
            navigator.clipboard.writeText(clabeInput.value);
            showToast('¡CLABE copiada al portapapeles!');
        } catch (err) {
            showToast('Error al copiar. Por favor, hazlo manualmente.');
        }
    }

    function saveAsImage() {
        showLoader(true);
        const elementToCapture = document.getElementById('main-content');
        html2canvas(elementToCapture, {
            useCORS: true,
            scale: 2
        }).then(canvas => {
            const link = document.createElement('a');
            const patientName = patientData ? patientData.nombre.replace(/\s+/g, '_') : 'paciente';
            link.download = `Avance-AppReceta-${patientName}-${new Date().toISOString().slice(0,10)}.png`;
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
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 500);
        }, 3000);
    }
    
    const style = document.createElement('style');
    style.textContent = `
        .toast {
            position: fixed;
            bottom: -50px; /* Inicia fuera de la pantalla */
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: #fff;
            padding: 12px 20px;
            border-radius: 25px;
            z-index: 1001;
            opacity: 0;
            transition: opacity 0.4s ease, bottom 0.4s ease;
        }
        .toast.show {
            opacity: 1;
            bottom: 30px;
        }
    `;
    document.head.appendChild(style);

    // --- INICIALIZACIÓN DE LA APP ---
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
