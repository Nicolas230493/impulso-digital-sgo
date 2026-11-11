// Mobile Drawer Controller
const mobileBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Close mobile drawer on link click
    const drawerLinks = mobileMenu.querySelectorAll('a');
    drawerLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });
}

// Gallery Dynamic Filtering System
function filterGallery(type) {
    const items = document.querySelectorAll('.gallery-item');
    const buttons = document.querySelectorAll('.gallery-filter-btn');
    
    // Highlight selected button
    buttons.forEach(btn => {
        btn.className = "gallery-filter-btn px-5 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-all";
    });

    const activeBtn = document.getElementById('g-filter-' + type);
    if (activeBtn) {
        activeBtn.className = "gallery-filter-btn px-5 py-2.5 rounded-full text-xs font-bold transition-all bg-cyber-cyan text-black";
    }

    // Animate grid visibility
    items.forEach(item => {
        if (type === 'all' || item.getAttribute('data-type') === type) {
            item.style.display = 'block';
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            }, 50);
        } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
                item.style.display = 'none';
            }, 300);
        }
    });
}

// Lightbox Operations
const lightboxModal = document.getElementById('media-lightbox');
const contentArea = document.getElementById('lightbox-content-area');
const captionText = document.getElementById('lightbox-caption');

function openLightbox(type, source, caption) {
    if (!contentArea || !captionText || !lightboxModal) return;
    contentArea.innerHTML = ''; // clear first
    captionText.textContent = caption;

    if (type === 'image') {
        const img = document.createElement('img');
        img.src = source;
        img.className = "max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl animate-fade-in";
        contentArea.appendChild(img);
    } else if (type === 'video') {
        const video = document.createElement('video');
        video.src = source;
        video.controls = true;
        video.autoplay = true;
        video.className = "max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl";
        contentArea.appendChild(video);
    }

    lightboxModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden'); // Block backdrop scrolling
}

function closeLightbox() {
    if (!lightboxModal || !contentArea) return;
    lightboxModal.classList.add('hidden');
    contentArea.innerHTML = ''; // prevent audio play in background
    document.body.classList.remove('overflow-hidden');
}

// Calculator Interactive Formula Logic
const budgetSlider = document.getElementById('budget-slider');
const displayBudget = document.getElementById('display-budget');
const tierBadge = document.getElementById('tier-badge');

const valReach = document.getElementById('val-reach');
const valLeads = document.getElementById('val-leads');
const valCpl = document.getElementById('val-cpl');

function updateCalculatorMetrics() {
    if (!budgetSlider || !displayBudget || !tierBadge || !valReach || !valLeads || !valCpl) return;
    
    const budget = parseInt(budgetSlider.value);
    
    // Format to currency style
    displayBudget.textContent = '$' + budget.toLocaleString('es-AR');

    // Dynamic calculations
    const reach = (budget * 8.5);
    let formattedReach = '';
    if (reach >= 1000000) {
        formattedReach = (reach / 1000000).toFixed(1) + 'M';
    } else {
        formattedReach = Math.floor(reach / 1000).toLocaleString('es-AR') + 'k';
    }
    valReach.textContent = formattedReach;

    // Leads count
    const baseLeads = Math.floor(budget / 620);
    const rangeMin = Math.floor(baseLeads * 0.8);
    const rangeMax = Math.floor(baseLeads * 1.2);
    valLeads.textContent = `${rangeMin} - ${rangeMax}`;

    // Cost Per Lead (Dynamic decreasing with scale optimizations)
    let cplValue = 620;
    if (budget > 500000) cplValue = 510;
    else if (budget > 250000) cplValue = 560;
    valCpl.textContent = '$' + cplValue;

    // Strategy tier text
    if (budget <= 150000) {
        tierBadge.textContent = "Presencia Básica Local";
        tierBadge.className = "text-xs font-black text-slate-400 uppercase tracking-wider";
    } else if (budget <= 400000) {
        tierBadge.textContent = "Aceleración Digital";
        tierBadge.className = "text-xs font-black text-cyber-cyan uppercase tracking-wider";
    } else {
        tierBadge.textContent = "Dominio de Mercado 360";
        tierBadge.className = "text-xs font-black text-cyber-violet uppercase tracking-wider animate-pulse";
    }
}

if (budgetSlider) {
    budgetSlider.addEventListener('input', updateCalculatorMetrics);
    // Initial execution
    updateCalculatorMetrics();
}

// Populate calculator data into form
function applyCalculatorToContact() {
    const budgetStr = displayBudget.textContent;
    const selectedTier = tierBadge.textContent;

    const selectEl = document.getElementById('form-service');
    const messageEl = document.getElementById('form-message');

    if (!selectEl || !messageEl) return;

    selectEl.value = "SEO & SEM"; // Ads selection
    messageEl.value = `¡Hola Impulso Digital! 🚀 Estuve evaluando mi marca con el Simulador de ROI en la web y me interesa activar la estrategia "${selectedTier}" para una inversión aproximada de ${budgetStr} mensual.`;

    // Scroll smoothly
    document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });

    // Highlight border animation
    const container = selectEl.closest('.bg-cyber-card');
    container.classList.add('ring-2', 'ring-cyber-cyan');
    setTimeout(() => {
        container.classList.remove('ring-2', 'ring-cyber-cyan');
    }, 2000);
}

// Dynamic Portfolio Filter
function filterPortfolio(category) {
    const items = document.querySelectorAll('.portfolio-item');
    const buttons = document.querySelectorAll('.portfolio-filter-btn');
    
    buttons.forEach(btn => {
        btn.className = "portfolio-filter-btn px-5 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-all";
    });

    const activeBtn = document.getElementById('btn-filter-' + category);
    if (activeBtn) {
        activeBtn.className = "portfolio-filter-btn px-5 py-2.5 rounded-full text-xs font-bold transition-all bg-cyber-cyan text-black";
    }

    items.forEach(item => {
        if (category === 'all' || item.getAttribute('data-category') === category) {
            item.style.display = 'block';
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'scale(1)';
            }, 50);
        } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
                item.style.display = 'none';
            }, 300);
        }
    });
}

// Pricing Toggle Cycle Switcher
let pricingCycle = 'trimestral'; 
const cycleToggleBtn = document.getElementById('price-toggle-btn');
const cycleToggleDot = document.getElementById('price-toggle-dot');
const txtCycleMonthly = document.getElementById('cycle-monthly');
const txtCycleQuarterly = document.getElementById('cycle-quarterly');

// Plan Price Targets
const p1Val = document.getElementById('p1-price');
const p2Val = document.getElementById('p2-price');
const p3Val = document.getElementById('p3-price');

const p1Period = document.getElementById('p1-period');
const p2Period = document.getElementById('p2-period');
const p3Period = document.getElementById('p3-period');

const starterBase = 150000;
const accelBase = 250000;
const corpBase = 400000;

function updatePricingVisuals() {
    if (!cycleToggleDot || !txtCycleMonthly || !txtCycleQuarterly || !p1Val || !p2Val || !p3Val || !p1Period || !p2Period || !p3Period) return;
    
    if (pricingCycle === 'trimestral') {
        cycleToggleDot.classList.replace('translate-x-0', 'translate-x-6');
        txtCycleMonthly.classList.replace('text-white', 'text-slate-400');
        txtCycleQuarterly.classList.replace('text-slate-400', 'text-white');

        p1Val.textContent = '$' + Math.floor(starterBase * 0.85).toLocaleString('es-AR');
        p2Val.textContent = '$' + Math.floor(accelBase * 0.85).toLocaleString('es-AR');
        p3Val.textContent = '$' + Math.floor(corpBase * 0.85).toLocaleString('es-AR');

        p1Period.textContent = '/mes (fac. trimestral)';
        p2Period.textContent = '/mes (fac. trimestral)';
        p3Period.textContent = '/mes (fac. trimestral)';
    } else {
        cycleToggleDot.classList.replace('translate-x-6', 'translate-x-0');
        txtCycleMonthly.classList.replace('text-slate-400', 'text-white');
        txtCycleQuarterly.classList.replace('text-white', 'text-slate-400');

        p1Val.textContent = '$' + starterBase.toLocaleString('es-AR');
        p2Val.textContent = '$' + accelBase.toLocaleString('es-AR');
        p3Val.textContent = '$' + corpBase.toLocaleString('es-AR');

        p1Period.textContent = '/mes';
        p2Period.textContent = '/mes';
        p3Period.textContent = '/mes';
    }
}

if (cycleToggleBtn) {
    cycleToggleBtn.addEventListener('click', () => {
        pricingCycle = (pricingCycle === 'trimestral') ? 'mensual' : 'trimestral';
        updatePricingVisuals();
    });
}

// Autocomplete price plan selection
function selectPricePlan(planName) {
    const selectEl = document.getElementById('form-service');
    const messageEl = document.getElementById('form-message');

    if (!selectEl || !messageEl) return;

    selectEl.value = planName;
    const billingLabel = (pricingCycle === 'trimestral') ? 'Trimestral con Descuento' : 'Mensual Estándar';
    messageEl.value = `¡Hola! Me gustaría coordinar una reunión para contratar el Plan "${planName}" bajo el formato de facturación: ${billingLabel}.`;

    // Scroll to Form
    document.getElementById('contacto').scrollIntoView({ behavior: 'smooth' });

    // Accent animation around container
    const container = selectEl.closest('.bg-cyber-card');
    container.classList.add('ring-2', 'ring-cyber-cyan');
    setTimeout(() => {
        container.classList.remove('ring-2', 'ring-cyber-cyan');
    }, 2000);
}

// Service selector trigger helper
function preselectService(serviceName) {
    const selectEl = document.getElementById('form-service');
    const messageEl = document.getElementById('form-message');

    if (!selectEl || !messageEl) return;
    selectEl.value = serviceName;
    messageEl.value = `¡Hola Impulso Digital! 🚀 Deseo realizar una consulta puntual sobre su servicio: ${serviceName}.`;
}

// Form Submit Simulators
function handleCyberSubmit(event) {
    event.preventDefault();
    const successModal = document.getElementById('modal-success-cyber');
    if (successModal) successModal.classList.remove('hidden');
}

function resetCyberForm() {
    const form = document.getElementById('contact-form-cyber');
    const successModal = document.getElementById('modal-success-cyber');
    if (form) form.reset();
    if (successModal) successModal.classList.add('hidden');
}

// High conversion Direct WhatsApp string encoder
function sendWhatsAppCyber() {
    const name = document.getElementById('form-name').value || 'Cliente de la Web';
    const phone = document.getElementById('form-phone').value || 'Sin especificar';
    const email = document.getElementById('form-email').value || 'Sin especificar';
    const service = document.getElementById('form-service').value;
    const msg = document.getElementById('form-message').value || 'Deseo conocer más sobre sus servicios de impulso digital.';

    const rawString = `¡Hola Impulso Digital Sgo! 🚀\n\nMe pongo en contacto para coordinar una consultoría estratégica:\n\n• *Nombre:* ${name}\n• *Celular:* ${phone}\n• *Email:* ${email}\n• *Interés:* ${service}\n\n*Mensaje:* ${msg}`;
    
    const encoded = encodeURIComponent(rawString);
    window.open(`https://wa.me/541154778514?text=${encoded}`, '_blank');
}
