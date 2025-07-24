// << PEGA AQUÍ EL ENLACE .CSV QUE COPIASTE DE GOOGLE SHEETS >>
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCh0jOiaAGNdoytpJ1sU8W-tJHO6ef1Mmgu4JpMA7oU3KvAvWNmioFlLJ4XzHH_Tgk1-wPAvpw7YaM/pub?gid=0&single=true&output=csv';

document.addEventListener('DOMContentLoaded', () => {
    // Si estamos en la página de la app, cargamos los datos
    if (document.getElementById('app-content')) {
        loadPatientData();
    }
});

async function fetchData() {
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        if (!response.ok) {
            throw new Error('Error al cargar la base de datos.');
        }
        const text = await response.text();
        return Papa.parse(text, { header: true }).data;
    } catch (error) {
        console.error('Error en fetchData:', error);
        return null;
    }
}

async function loadPatientData() {
    const patientCode = localStorage.getItem('patientCode');
    const loader = document.getElementById('loader');
    
    if (!patientCode) {
        loader.textContent = 'Error: No se encontró código de paciente. Por favor, vuelve a la página de inicio.';
        return;
    }

    // Usaremos la librería PapaParse para leer el CSV. La incluimos desde un CDN.
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js';
    script.onload = async () => {
        const data = await fetchData();
        if (!data) {
            loader.textContent = 'No se pudieron cargar los datos. Revisa la conexión o el enlace de la base deatos.';
            return;
        }

        const patientData = data.find(row => row.codigo_unico && row.codigo_unico.trim().toUpperCase() === patientCode);

        if (patientData) {
            loader.style.display = 'none';
            displayPatientInfo(patientData);
            displayMedications(patientData);
            setupActionButtons(patientData);
            document.getElementById('patient-info').style.display = 'block';
            document.getElementById('diagnosis-section').style.display = 'block';

        } else {
            loader.textContent = `Código "${patientCode}" no encontrado. Verifica que sea correcto.`;
        }
    };
    document.head.appendChild(script);
}

function displayPatientInfo(data) {
    document.getElementById('patient-name').textContent = data.nombre_completo || 'N/A';
    document.getElementById('patient-dob').textContent = data.fecha_nacimiento || 'N/A';
    document.getElementById('patient-weight').textContent = `${data.peso_kg || 'N/A'} kg`;
    document.getElementById('patient-diagnosis').textContent = data.diagnostico || 'No especificado.';

    if (data.alergias && data.alergias.trim() !== '') {
        document.getElementById('patient-allergies').textContent = `ALERGIAS: ${data.alergias}`;
    } else {
        document.getElementById('patient-allergies').style.display = 'none';
    }

    // Calcular edad
    if (data.fecha_nacimiento) {
        document.getElementById('patient-age').textContent = calculateAge(data.fecha_nacimiento);
    }
    
    // Fecha actual
    const today = new Date();
    document.getElementById('current-date').textContent = today.toLocaleDateString('es-ES');
}

function calculateAge(dobString) {
    // Asumimos formato DD/MM/AAAA
    const parts = dobString.split('/');
    if (parts.length !== 3) return 'Fecha inválida';
    const dob = new Date(parts[2], parts[1] - 1, parts[0]);
    
    let today = new Date();
    let years = today.getFullYear() - dob.getFullYear();
    let months = today.getMonth() - dob.getMonth();
    let days = today.getDate() - dob.getDate();

    if (days < 0) {
        months--;
        days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }
    return `${years} años, ${months} meses y ${days} días`;
}function calculateAge(dobString) {
    // Asegurarse de que el formato es DD/MM/AAAA y es una fecha válida.
    const parts = dobString.split('/');
    if (parts.length !== 3 || parts[0].length > 2 || parts[1].length > 2 || parts[2].length !== 4) {
        return 'Formato de fecha inválido';
    }function calculateAge(dobString) {
    if (!dobString || typeof dobString !== 'string') {
        return 'Fecha no proporcionada.';
    }

    // Limpia la fecha de espacios y usa '/' o '-' como separador
    const cleanedDobString = dobString.trim();
    const parts = cleanedDobString.split(/[/|-]/);

    if (parts.length !== 3) {
        return 'Formato de fecha inválido.';
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Mes en JS es 0-indexado
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return 'Fecha contiene caracteres no válidos.';
    }

    const dob = new Date(year, month, day);

    // Verificación final para fechas inválidas (ej. 31/02/2024)
    if (dob.getFullYear() !== year || dob.getMonth() !== month || dob.getDate() !== day) {
        return "La fecha no existe.";
    }

    const today = new Date();
    if (dob > today) {
        return "La fecha de nacimiento no puede ser en el futuro.";
    }
    
    let ageYears = today.getFullYear() - dob.getFullYear();
    let ageMonths = today.getMonth() - dob.getMonth();
    let ageDays = today.getDate() - dob.getDate();

    if (ageDays < 0) {
        ageMonths--;
        ageDays += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }

    if (ageMonths < 0) {
        ageYears--;
        ageMonths += 12;
    }

    return `${ageYears} años, ${ageMonths} meses y ${ageDays} días`;
}

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Mes en JS es 0-indexado (0=Enero, 11=Diciembre)
    const year = parseInt(parts[2], 10);

    const dob = new Date(year, month, day);

    // Verificación adicional para fechas inválidas (ej. 31/02/2024)
    if (dob.getFullYear() !== year || dob.getMonth() !== month || dob.getDate() !== day) {
        return "Fecha inexistente.";
    }

    const today = new Date();
    
    let ageYears = today.getFullYear() - dob.getFullYear();
    let ageMonths = today.getMonth() - dob.getMonth();
    let ageDays = today.getDate() - dob.getDate();

    // Ajustar si el día actual es menor que el día de nacimiento
    if (ageDays < 0) {
        ageMonths--;
        // new Date(año, mes, 0) nos da el último día del mes anterior
        ageDays += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }

    // Ajustar si el mes actual es menor que el mes de nacimiento
    if (ageMonths < 0) {
        ageYears--;
        ageMonths += 12;
    }

    return `${ageYears} años, ${ageMonths} meses y ${ageDays} días`;
}

function displayMedications(data) {
    const container = document.getElementById('medication-list');
    const patientCode = localStorage.getItem('patientCode');
    container.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) { // Busca hasta 10 medicamentos
        if (data[`med${i}_generico`] && data[`med${i}_generico`].trim() !== '') {
            const medId = `med${i}`;
            const med = {
                generico: data[`med${i}_generico`],
                comercial: data[`med${i}_comercial`],
                duracion: data[`med${i}_duracion`],
                // ... (el resto de los campos que ya tenías)
                presentacion: data[`med${i}_presentacion`],
                concentracion: data[`med${i}_concentracion`],
                surtir: data[`med${i}_surtir`],
                via: data[`med${i}_via`],
                dosis: data[`med${i}_dosis`],
                frecuencia: data[`med${i}_frecuencia`],
                indicaciones: data[`med${i}_indicaciones`],
                fecha_indicacion: data[`med${i}_fecha_indicacion`]
            };

            // --- LÓGICA PARA CARGAR PROGRESO ---
            const savedProgress = JSON.parse(localStorage.getItem(`${patientCode}_${medId}_progress`)) || {};
            const savedStatus = localStorage.getItem(`${patientCode}_${medId}_status`);
            
            let progressChecksHTML = '';
            const duration = parseInt(med.duracion) || 0;
            for (let day = 1; day <= duration; day++) {
                const isChecked = savedProgress[day] ? 'checked' : '';
                progressChecksHTML += `
                    <label>
                        <input type="checkbox" data-day="${day}" ${isChecked}>
                        <span>${day}</span>
                    </label>
                `;
            }

            const isFinished = savedStatus === 'finished' ? 'checked' : '';
            const isSuspended = savedStatus === 'suspended' ? 'checked' : '';
            const cardStatusClass = savedStatus ? `status-${savedStatus}` : '';

            const medicationHTML = `
                <article class="medication-item card ${cardStatusClass}" id="${medId}">
                    <div class="medication-header">
                        <h4>${med.generico} (${med.comercial || 'N/A'})</h4>
                        <small>Indicado el: ${med.fecha_indicacion || 'N/A'}</small>
                    </div>
                    <div class="medication-details">
                        <p><strong>Presentación:</strong> ${med.presentacion || 'N/A'}</p>
                        <p><strong>Concentración:</strong> ${med.concentracion || 'N/A'}</p>
                        <p><strong>Surtir:</strong> ${med.surtir || 'N/A'}</p>
                        <p><strong>Vía:</strong> ${med.via || 'N/A'}</p>
                        <p><strong>Dosis:</strong> ${med.dosis || 'N/A'}</p>
                        <p><strong>Frecuencia:</strong> ${med.frecuencia || 'N/A'}</p>
                    </div>
                    <p><strong>Duración:</strong> ${med.duracion || 'N/A'} días</p>
                    <p><strong>Indicaciones Especiales:</strong> ${med.indicaciones || 'Ninguna'}</p>

                    <div class="progress-tracker">
                        <strong>Avance del tratamiento (días):</strong>
                        <div class="progress-checks">${progressChecksHTML}</div>
                    </div>
                    <div class="treatment-status">
                        <strong>Estado del Tratamiento:</strong>
                        <input type="radio" name="status_${medId}" id="status_finished_${i}" value="finished" ${isFinished}>
                        <label for="status_finished_${i}">✅ Terminado</label>
                        <input type="radio" name="status_${medId}" id="status_suspended_${i}" value="suspended" ${isSuspended}>
                        <label for="status_suspended_${i}">❌ Suspendido</label>
                    </div>
                </article>
            `;
            container.innerHTML += medicationHTML;
        }
    }
}

function setupActionButtons(data) {
    const expedienteBtn = document.getElementById('expediente-btn');
    if (data.enlace_expediente) {
        expedienteBtn.href = data.enlace_expediente;
    } else {
        expedienteBtn.style.display = 'none';
    }

    const telegramBtn = document.getElementById('telegram-btn');
    if (data.enlace_telegram) {
        telegramBtn.href = data.enlace_telegram;
    } else {
        telegramBtn.style.display = 'none';
    }

    // Botón para guardar imagen
    document.getElementById('save-image-btn').addEventListener('click', () => {
        const content = document.getElementById('app-content');
        html2canvas(content, { 
            useCORS: true, 
            backgroundColor: '#eef2f5' 
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Avance_AppReceta_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    });
}
function setupDynamicEventListeners() {
    const medList = document.getElementById('medication-list');
    const patientCode = localStorage.getItem('patientCode');
    if (!medList || !patientCode) return;

    medList.addEventListener('change', function(event) {
        const medicationCard = event.target.closest('.medication-item');
        if (!medicationCard) return;
        const medId = medicationCard.id;

        // --- GUARDAR PROGRESO DE DÍAS ---
        if (event.target.type === 'checkbox') {
            const day = event.target.dataset.day;
            const progressKey = `${patientCode}_${medId}_progress`;
            const savedProgress = JSON.parse(localStorage.getItem(progressKey)) || {};
            savedProgress[day] = event.target.checked;
            localStorage.setItem(progressKey, JSON.stringify(savedProgress));
        }

        // --- GUARDAR ESTADO DEL TRATAMIENTO ---
        if (event.target.type === 'radio' && event.target.name.startsWith('status_')) {
            const statusKey = `${patientCode}_${medId}_status`;
            localStorage.setItem(statusKey, event.target.value);
            
            medicationCard.classList.remove('status-finished', 'status-suspended');
            if (event.target.checked) {
                medicationCard.classList.add(`status-${event.target.value}`);
            }
        }
    });
}

// Invocamos la función después de que los datos del paciente se cargan
const originalLoadPatientData = window.loadPatientData;
window.loadPatientData = async function() {
    await originalLoadPatientData();
    setupDynamicEventListeners();
};
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('patientCode'); // Borra solo el código del paciente
            window.location.href = 'index.html'; // Redirige a la página de inicio
        });
    }
}

// Asegúrate de llamar a esta función cuando la página cargue
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-content')) {
        loadPatientData();
        setupLogoutButton(); // <-- AÑADE ESTA LÍNEA
    }
});
