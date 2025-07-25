// script.js (Versión Final Unificada)

// URL de la base de datos en Google Sheets
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCh0jOiaAGNdoytpJ1sU8W-tJHO6ef1Mmgu4JpMA7oU3KvAvWNmioFlLJ4XzHH_Tgk1-wPAvpw7YaM/pub?gid=0&single=true&output=csv';

// --- FUNCIONES PRINCIPALES DE CARGA Y VISUALIZACIÓN ---

/**
 * Busca y convierte los datos del archivo CSV de Google Sheets.
 */
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

/**
 * Carga y muestra toda la información en la página principal de la app.
 */
async function loadPatientData() {
    const loader = document.getElementById('loader');
    const patientCode = localStorage.getItem('patientCode');
    
    if (!patientCode) {
        loader.textContent = 'Error: No se encontró código de paciente. Por favor, vuelve a la página de inicio.';
        return;
    }

    const data = await fetchData();
    if (!data) {
        loader.textContent = 'No se pudieron cargar los datos. Revisa la conexión o el enlace de la base de datos.';
        return;
    }

    const patientData = data.find(row => row.codigo_unico && row.codigo_unico.trim().toUpperCase() === patientCode);

    if (patientData) {
        // Oculta el cargador y muestra la información
        loader.style.display = 'none';
        displayPatientInfo(patientData);
        displayMedications(patientData);
        setupActionButtons(patientData);
        
        // Llamamos a las funciones de configuración aquí, después de crear los elementos
        setupDynamicEventListeners();
        setupLogoutButton();

        document.getElementById('patient-info').style.display = 'block';
        document.getElementById('diagnosis-section').style.display = 'block';

    } else {
        loader.textContent = `Código "${patientCode}" no encontrado. Verifica que sea correcto.`;
    }
}

/**
 * Muestra la información personal del paciente.
 */
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

    document.getElementById('patient-age').textContent = calculateAge(data.fecha_nacimiento);
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Muestra la lista de medicamentos indicados.
 */
function displayMedications(data) {
    const container = document.getElementById('medication-list');
    const patientCode = localStorage.getItem('patientCode');
    
    let allMedicationsHTML = [];
    let medicationCount = 0;

    for (let i = 1; i <= 10; i++) {
        if (data[`med${i}_generico`] && data[`med${i}_generico`].trim() !== '') {
            medicationCount++;
            const medId = `med${i}`;
            const med = {
                generico: data[`med${i}_generico`],
                comercial: data[`med${i}_comercial`],
                duracion: data[`med${i}_duracion`],
                presentacion: data[`med${i}_presentacion`],
                concentracion: data[`med${i}_concentracion`],
                surtir: data[`med${i}_surtir`],
                via: data[`med${i}_via`],
                dosis: data[`med${i}_dosis`],
                frecuencia: data[`med${i}_frecuencia`],
                indicaciones: data[`med${i}_indicaciones`],
                fecha_indicacion: data[`med${i}_fecha_indicacion`]
            };

            const savedProgress = JSON.parse(localStorage.getItem(`${patientCode}_${medId}_progress`)) || {};
            const savedStatus = localStorage.getItem(`${patientCode}_${medId}_status`);
            
            let progressChecksHTML = '';
            const duration = parseInt(med.duracion) || 0;
            for (let day = 1; day <= duration; day++) {
                const isChecked = savedProgress[day] ? 'checked' : '';
                progressChecksHTML += `<label><input type="checkbox" data-day="${day}" ${isChecked}><span>${day}</span></label>`;
            }

            const isFinished = savedStatus === 'finished' ? 'checked' : '';
            const isSuspended = savedStatus === 'suspended' ? 'checked' : '';
            const cardStatusClass = savedStatus ? `status-${savedStatus}` : '';

            const medicationHTML = `
                <article class="medication-item card ${cardStatusClass}" id="${medId}">
                    <div class="medication-header"><h4>${med.generico} (${med.comercial || 'N/A'})</h4><small>Indicado el: ${med.fecha_indicacion || 'N/A'}</small></div>
                    <div class="medication-details">
                        <p><strong>Presentación:</strong> ${med.presentacion || 'N/A'}</p><p><strong>Concentración:</strong> ${med.concentracion || 'N/A'}</p>
                        <p><strong>Surtir:</strong> ${med.surtir || 'N/A'}</p><p><strong>Vía:</strong> ${med.via || 'N/A'}</p>
                        <p><strong>Dosis:</strong> ${med.dosis || 'N/A'}</p><p><strong>Frecuencia:</strong> ${med.frecuencia || 'N/A'}</p>
                    </div>
                    <p><strong>Duración:</strong> ${med.duracion || 'N/A'} días</p><p><strong>Indicaciones Especiales:</strong> ${med.indicaciones || 'Ninguna'}</p>
                    <div class="progress-tracker"><strong>Avance del tratamiento (días):</strong><div class="progress-checks">${progressChecksHTML}</div></div>
                    <div class="treatment-status">
                        <strong>Estado del Tratamiento:</strong>
                        <input type="radio" name="status_${medId}" id="status_finished_${i}" value="finished" ${isFinished}><label for="status_finished_${i}">✅ Terminado</label>
                        <input type="radio" name="status_${medId}" id="status_suspended_${i}" value="suspended" ${isSuspended}><label for="status_suspended_${i}">❌ Suspendido</label>
                    </div>
                </article>
            `;
            allMedicationsHTML.push(medicationHTML);
        }
    }

    if (medicationCount === 0) {
        container.innerHTML = `<div class="card"><p>No hay medicamentos indicados por el momento.</p></div>`;
    } else {
        container.innerHTML = allMedicationsHTML.join('');
    }
}


// --- LÓGICA PARA PÁGINA DE RECETA IMPRIMIBLE ---

/**
 * Carga y muestra los datos en la página de la receta médica.
 */
async function populateRecetaPage() {
    const patientCode = localStorage.getItem('patientCode');
    if (!patientCode) {
        document.body.innerHTML = 'Error: No se encontró código de paciente. Vuelva a la app e inténtelo de nuevo.';
        return;
    }

    const data = await fetchData();
    if (!data) {
        document.body.innerHTML = 'Error al cargar los datos.';
        return;
    }

    const patientData = data.find(row => row.codigo_unico && row.codigo_unico.trim().toUpperCase() === patientCode);

    if (patientData) {
        document.getElementById('receta-paciente').textContent = patientData.nombre_completo || '';
        document.getElementById('receta-dob').textContent = patientData.fecha_nacimiento || '';
        document.getElementById('receta-diagnostico').textContent = patientData.diagnostico || 'No especificado.';
        document.getElementById('receta-fecha').textContent = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

        const medList = document.getElementById('receta-medicamentos');
        medList.innerHTML = '';
        let medCount = 0;
        for (let i = 1; i <= 10; i++) {
            if (patientData[`med${i}_generico`] && patientData[`med${i}_generico`].trim() !== '') {
                medCount++;
                const medItem = document.createElement('li');
                medItem.innerHTML = `
                    <strong>${patientData[`med${i}_generico`]} (${patientData[`med${i}_comercial`]})</strong> - ${patientData[`med${i}_presentacion`]} ${patientData[`med${i}_concentracion`]}<br>
                    Surtir: ${patientData[`med${i}_surtir`]}<br>
                    Indicaciones: ${patientData[`med${i}_dosis`]} ${patientData[`med${i}_via`]} cada ${patientData[`med${i}_frecuencia`]} por ${patientData[`med${i}_duracion`]} días.<br>
                    <i>${patientData[`med${i}_indicaciones`]}</i>
                `;
                medList.appendChild(medItem);
            }
        }
        if (medCount === 0) {
            medList.innerHTML = '<li>No hay medicamentos indicados.</li>';
        }
    } else {
        document.body.innerHTML = `Error: Paciente con código "${patientCode}" no encontrado.`;
    }
}


// --- FUNCIONES DE CONFIGURACIÓN Y UTILIDADES ---

/**
 * Calcula la edad de forma precisa.
 */
function calculateAge(dobString) {
    if (!dobString || typeof dobString !== 'string') return 'Fecha no proporcionada.';
    const cleanedDobString = dobString.trim();
    const parts = cleanedDobString.split(/[/|-]/);
    if (parts.length !== 3) return 'Formato de fecha inválido.';
    const day = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1, year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return 'Fecha contiene caracteres no válidos.';
    const dob = new Date(year, month, day);
    if (dob.getFullYear() !== year || dob.getMonth() !== month || dob.getDate() !== day) return "La fecha no existe.";
    const today = new Date();
    if (dob > today) return "Fecha de nacimiento en el futuro.";
    let ageYears = today.getFullYear() - dob.getFullYear(), ageMonths = today.getMonth() - dob.getMonth(), ageDays = today.getDate() - dob.getDate();
    if (ageDays < 0) { ageMonths--; ageDays += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
    if (ageMonths < 0) { ageYears--; ageMonths += 12; }
    return `${ageYears} años, ${ageMonths} meses y ${ageDays} días`;
}

/**
 * Añade interactividad a los botones de la app principal.
 */
function setupDynamicEventListeners() {
    const medList = document.getElementById('medication-list');
    const patientCode = localStorage.getItem('patientCode');
    if (!medList || !patientCode) return;

    medList.addEventListener('change', function(event) {
        const medicationCard = event.target.closest('.medication-item');
        if (!medicationCard) return;
        const medId = medicationCard.id;

        if (event.target.type === 'checkbox') {
            const day = event.target.dataset.day;
            const progressKey = `${patientCode}_${medId}_progress`;
            const savedProgress = JSON.parse(localStorage.getItem(progressKey)) || {};
            savedProgress[day] = event.target.checked;
            localStorage.setItem(progressKey, JSON.stringify(savedProgress));
        }

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

/**
 * Configura los botones de acción como enlaces a Expediente y Telegram.
 */
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

    document.getElementById('save-image-btn').addEventListener('click', () => {
        html2canvas(document.getElementById('app-content'), { useCORS: true, backgroundColor: '#f0f4f8' }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Avance_AppReceta_${new Date().toISOString().slice(0,10)}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    });
}

/**
 * Configura el botón para "cerrar sesión" y cambiar de paciente.
 */
function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('patientCode');
            window.location.href = 'index.html';
        });
    }
}


// --- PUNTO DE ENTRADA PRINCIPAL DE LA APP ---

/**
 * Este es el inicializador que se ejecuta cuando el DOM está listo.
 * Decide qué función principal llamar dependiendo de la página actual.
 */
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.page')) { // Identificador de receta.html
        populateRecetaPage();
    } else if (document.getElementById('app-content')) { // Identificador de app.html
        loadPatientData();
    }
});
