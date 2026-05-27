// ==================== حماية الصفحة ====================
const sessionData = localStorage.getItem('scout_leader_session');
if (!sessionData) { window.location.href = 'index.html'; }
const currentUser = JSON.parse(sessionData);

document.addEventListener('DOMContentLoaded', () => {
    applyRoleRestrictions();
    fetchScouts();
});

const SUPABASE_URL = 'https://xbdprjxvtwfieiqncbez.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZHByanh2dHdmaWVpcW5jYmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjI2NDgsImV4cCI6MjA5NTI5ODY0OH0.ptteVMU6OYawOqiQinKg2FQ_fpP-_VdG3BJY6alkgXM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allScouts = [];
let attendanceData = [];
let currentFilterStage = 'الكل';
let scoutChartInstance = null;

// ==================== الصور والمراحل المدمجة ====================
function getDirectDriveLink(url) {
    if (!url || url.trim() === '') return 'https://via.placeholder.com/150?text=No+Image';
    const match = url.match(/(?:id=|d\/)([\w-]{25,33})/);
    if (match && match[1]) {
        const driveLink = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
        return `https://wsrv.nl/?url=${encodeURIComponent(driveLink)}&output=webp`;
    }
    return 'https://via.placeholder.com/150?text=No+Image';
}

// تم دمج المراحل بناءً على طلبك
function getScoutStage(schoolStage, gender) {
    if (!schoolStage) return 'مش محدد';
    const stage = schoolStage.trim();
    if (stage === 'براعم') return 'براعم';
    else if (stage === 'ابتدائي') return 'أشبال وزهرات';
    else if (stage === 'اعدادي') return 'مبتدئ ومرشدات';
    else if (stage === 'ثانوي') return 'متقدم ورائدات';
    else return 'مش محدد';
}

// دالة تطبيع أسماء المراحل من المنفصلة إلى الموحدة
function normalizeScoutGroup(troop) {
    if (!troop) return '';
    const normalizations = {
        'أشبال': 'أشبال وزهرات',
        'زهرات': 'أشبال وزهرات',
        'كشاف مبتدئ': 'مبتدئ ومرشدات',
        'مرشدات': 'مبتدئ ومرشدات',
        'كشاف متقدم': 'متقدم ورائدات',
        'رائدات': 'متقدم ورائدات'
    };
    return normalizations[troop.trim()] || troop;
}

function applyRoleRestrictions() {
    if (currentUser.role === 'Viewer') {
        const addBtn = document.getElementById('addScoutBtn'); 
        if (addBtn) addBtn.style.display = 'none';
    }
    if (currentUser.role === 'TroopLeader' || currentUser.role === 'SectorLeader') {
        const tabBtns = document.querySelectorAll('.tab-btn'); 
        let allowedTabs = ['الكل'];
        const targetGroup = currentUser.role === 'TroopLeader' ? currentUser.troop : currentUser.sector;
        allowedTabs.push(targetGroup);
        
        tabBtns.forEach(btn => { if (!allowedTabs.includes(btn.innerText.trim())) btn.style.display = 'none'; });
    }
}

// استبدل دالة fetchScouts القديمة بالكامل بدي:
async function fetchScouts() {
    // كل القادة (قطاع أو فرقة) يشوفوا الكشافين المقبولين بس
    // الماستر والقائد العام يشوفوا الكل
    let query = supabaseClient.from('scouts').select('*').order('scout_id', { ascending: true });
    
    if (currentUser.role !== 'Master' && currentUser.role !== 'General') {
        query = query.eq('status', 'مقبول');
    }

    // هنا التوحيد: قائد القطاع وقائد الفرقة بيشوفوا نفس نطاق المرحلة الدراسية
    if (currentUser.role === 'TroopLeader' || currentUser.role === 'SectorLeader') {
        const stageMap = { 'براعم': 'براعم', 'أشبال وزهرات': 'ابتدائي', 'مبتدئ ومرشدات': 'اعدادي', 'متقدم ورائدات': 'ثانوي' };
        const userStage = currentUser.troop || currentUser.sector;
        query = query.eq('school_stage', stageMap[userStage] || userStage);
    }

    const { data, error } = await query;
    if (error) return alert('فشل التحميل: ' + error.message); 
    
    allScouts = data.map(scout => { scout.scout_group = getScoutStage(scout.school_stage, scout.gender); return scout; });
    renderTable(); 
}

function renderTable() {
    const tbody = document.getElementById('scoutsTableBody');
    if(!tbody) return;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    tbody.innerHTML = '';
    const filteredScouts = allScouts.filter(scout => {
        const matchesTab = currentFilterStage === 'الكل' || scout.scout_group === currentFilterStage;
        return matchesTab && `${scout.full_name} ${scout.scout_id} ${scout.personal_phone}`.toLowerCase().includes(searchTerm);
    });
    if (filteredScouts.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">مفيش نتايج...</td></tr>`; return; }
    filteredScouts.forEach(scout => {
        const imgSrc = getDirectDriveLink(scout.photo_url);
        const tr = document.createElement('tr');
        let actionsHtml = `<button onclick="viewProfile('${scout.scout_id}')" class="text-blue-600 hover:text-blue-900 text-lg"><i class="fa-solid fa-address-card"></i></button>`;
        if (currentUser.role !== 'Viewer') actionsHtml += `<button onclick="openEditModal('${scout.scout_id}')" class="text-green-600 hover:text-green-900 text-lg ml-3 mr-3"><i class="fa-solid fa-user-pen"></i></button>`;
        if (['Master', 'General', 'SectorLeader'].includes(currentUser.role)) actionsHtml += `<button onclick="deleteScout('${scout.scout_id}')" class="text-red-500 hover:text-red-800 text-lg"><i class="fa-solid fa-user-minus"></i></button>`;
        tr.innerHTML = `
            <td class="p-4"><img src="${imgSrc}" class="w-11 h-11 rounded-full object-cover cursor-pointer border border-gray-600" onclick="openImagePreview('${imgSrc}')"></td>
            <td class="p-4 font-bold text-[var(--gold)]">${scout.scout_id}</td>
            <td class="p-4 font-medium text-white">${scout.full_name}</td>
            <td class="p-4"><span class="bg-[var(--dark3)] text-[var(--gold)] px-2.5 py-1 rounded-md text-xs font-bold border border-[var(--border)]">${scout.scout_group || '-'}</span></td>
            <td class="p-4 text-gray-400 font-mono" dir="ltr">${scout.personal_phone || '-'}</td>
            <td class="p-4 text-center">${actionsHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterData(stage, btnElement) {
    currentFilterStage = stage;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    renderTable();
    if(typeof calculateRankings === 'function') calculateRankings();
}

if(document.getElementById('searchInput')) document.getElementById('searchInput').addEventListener('input', () => { renderTable(); if(typeof calculateRankings === 'function') calculateRankings(); });

// ==================== الفحص الذكي في التعديل (Validation) ====================
function validateScoutData(data) {
    let isValid = true;
    function setError(inputId, message) {
        isValid = false;
        const inputEl = document.getElementById(inputId);
        if (inputEl) {
            inputEl.classList.add('border-red-500', 'bg-[rgba(139,26,26,0.1)]');
            let errorSpan = document.getElementById(inputId + '_error');
            if (!errorSpan) {
                errorSpan = document.createElement('span');
                errorSpan.id = inputId + '_error';
                errorSpan.className = 'text-red-500 text-xs mt-1 block font-bold';
                inputEl.parentNode.insertBefore(errorSpan, inputEl.nextSibling);
            }
            errorSpan.textContent = message;
            errorSpan.style.display = 'block';
        }
    }
    document.querySelectorAll('.form-input').forEach(el => {
        el.classList.remove('border-red-500', 'bg-[rgba(139,26,26,0.1)]');
        const errSpan = document.getElementById(el.id + '_error');
        if (errSpan) errSpan.style.display = 'none';
    });

    const nameRegex = /^[\u0600-\u06FF\s]+$/;
    if (!data.full_name) setError('formFullName', 'الاسم الرباعي مطلوب.');
    else if (!nameRegex.test(data.full_name)) setError('formFullName', 'الاسم لازم يتكتب بالعربي بس.');
    else if (data.full_name.trim().split(/\s+/).length < 3) setError('formFullName', 'الاسم لازم يكون ثلاثي أو رباعي.');

    const phoneRegex = /^01[0125]\d{8}$/;
    if (!data.personal_phone) setError('formPersonalPhone', 'رقم موبايل الكشاف مطلوب.');
    else if (!phoneRegex.test(data.personal_phone)) setError('formPersonalPhone', 'الرقم مش صحيح، لازم 11 رقم بيبدأ بـ 01.');
    if (data.father_phone && !phoneRegex.test(data.father_phone)) setError('formFatherPhone', 'رقم تليفون الأب مش صحيح.');
    if (data.mother_phone && !phoneRegex.test(data.mother_phone)) setError('formMotherPhone', 'رقم تليفون الأم مش صحيح.');
    return isValid;
}

// دالة التعديل
async function submitEditScout(id) {
    const data = getFormData();
    if (!validateScoutData(data)) return;

    const btn = document.getElementById('formSubmitBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> بيتحفظ...';

    const { error } = await supabaseClient.from('scouts').update(data).eq('scout_id', id);
    if (!error) {
        alert('البيانات اتعدلت بنجاح.');
        closeModal('formModal');
        fetchScouts();
    } else {
        alert('مشكلة في التعديل: ' + error.message);
    }
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> حفظ';
}

// ==================== البروفايل الكامل بالتقييمات والجراف ====================
async function viewProfile(id) {
    const scout = allScouts.find(s => s.scout_id === id);
    if (!scout) return;

    document.getElementById('modalImage').src = getDirectDriveLink(scout.photo_url);
    document.getElementById('modalName').textContent = scout.full_name;
    document.getElementById('modalID').textContent = `الكود: ${scout.scout_id}`;
    document.getElementById('modalStageBadge').textContent = scout.scout_group;

    const fieldLabels = { 'personal_phone': 'موبايل الكشاف', 'father_phone': 'تليفون الأب', 'mother_phone': 'تليفون الأم', 'address': 'العنوان بالكامل', 'school_stage': 'المرحلة الدراسية', 'school_year': 'السنة الدراسية', 'confession_father': 'أب الاعتراف', 'has_diseases': 'أمراض؟', 'diseases_details': 'تفاصيل الصحة' };
    let detailsHTML = '';
    Object.keys(fieldLabels).forEach(key => {
        let value = scout[key] || '-';
        let cardClass = (key === 'has_diseases' && value === 'نعم') ? 'bg-[rgba(139,26,26,0.2)] border-red-900' : 'bg-[var(--dark2)] border-[var(--border)]';
        detailsHTML += `<div class="p-3 border rounded-lg ${cardClass} flex flex-col gap-1"><span class="text-xs font-bold text-[var(--gold)]">${fieldLabels[key]}</span><span class="text-sm text-gray-200 break-words" ${key.includes('phone') ? 'dir="ltr"' : ''}>${value}</span></div>`;
    });
    document.getElementById('modalDetails').innerHTML = detailsHTML;

    document.getElementById('modalAttendanceDetails').innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-400">جاري تحميل التقييمات... <i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
    document.getElementById('profileModal').classList.remove('hidden');

    const { data: attData, error } = await supabaseClient.from('attendance').select('*').eq('scout_id', id).order('date', { ascending: true });
    
    const tbody = document.getElementById('modalAttendanceDetails');
    tbody.innerHTML = '';

    if (error || !attData || attData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-gray-500">مفيش أي غياب أو درجات اتسجلت للكشاف ده.</td></tr>';
        if(scoutChartInstance) scoutChartInstance.destroy();
        return;
    }

    let labels = [];
    let totalScores = [];

    attData.forEach(rec => {
        const total = (rec.attendance_score || 0) + (rec.commitment_score || 0) + (rec.uniform_score || 0) + (rec.activity_score || 0);
        labels.push(rec.date);
        totalScores.push(total);

        let statusColor = rec.status === 'حاضر' ? 'text-green-400' : (rec.status === 'إذن' ? 'text-yellow-400' : 'text-red-400');
        
        tbody.innerHTML += `
            <tr class="border-b border-[rgba(201,168,76,0.1)] hover:bg-[rgba(201,168,76,0.05)]">
                <td class="p-3 font-mono text-xs">${rec.date}</td>
                <td class="p-3 font-bold ${statusColor}">${rec.status}</td>
                <td class="p-3 text-center">${rec.attendance_score}</td>
                <td class="p-3 text-center">${rec.commitment_score}</td>
                <td class="p-3 text-center">${rec.uniform_score}</td>
                <td class="p-3 text-center">${rec.activity_score}</td>
                <td class="p-3 text-center font-bold text-[var(--gold)]">${total} <span class="text-gray-500 text-xs">/ 14</span></td>
            </tr>
        `;
    });

    const ctx = document.getElementById('scoutPerformanceChart').getContext('2d');
    if(scoutChartInstance) scoutChartInstance.destroy();

    scoutChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'إجمالي الدرجات من 14',
                data: totalScores,
                borderColor: '#c9a84c',
                backgroundColor: 'rgba(201,168,76,0.2)',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#c9a84c',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, max: 14, ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { ticks: { color: '#888' }, grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function openImagePreview(src) { document.getElementById('fullSizeImage').src = src; document.getElementById('imageModal').classList.remove('hidden'); }
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }

// ==================== الحسابات والترتيب العام للوحة التحكم ====================
async function calculateRankings() {
    const rankBody = document.getElementById('rankTableBody');
    if (!rankBody || document.getElementById('rankView').classList.contains('hidden')) return;

    rankBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-[var(--gold)]"><i class="fa-solid fa-spinner fa-spin mr-2"></i> جاري حساب الدرجات...</td></tr>`;

    if (attendanceData.length === 0) {
        const { data, error } = await supabaseClient.from('attendance').select('*');
        if (error) { rankBody.innerHTML = `<tr><td colspan="5" class="p-4 text-red-500">خطأ في جلب الدرجات</td></tr>`; return; }
        attendanceData = data || [];
    }

    const filteredScouts = allScouts.filter(scout => currentFilterStage === 'الكل' || scout.scout_group === currentFilterStage);
    
    let rankings = filteredScouts.map(scout => {
        const scoutRecords = attendanceData.filter(r => r.scout_id === scout.scout_id);
        const totalSessions = scoutRecords.length;
        let totalPoints = 0, presentCount = 0;

        scoutRecords.forEach(rec => {
            totalPoints += (rec.attendance_score || 0) + (rec.commitment_score || 0) + (rec.uniform_score || 0) + (rec.activity_score || 0);
            if (rec.status === 'حاضر') presentCount++;
        });

        return { id: scout.scout_id, name: scout.full_name, group: scout.scout_group, points: totalPoints, percentage: totalSessions === 0 ? 0 : Math.round((presentCount / totalSessions) * 100) };
    });

    rankings.sort((a, b) => b.points - a.points);
    rankBody.innerHTML = '';
    if (rankings.length === 0) { rankBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500">مفيش بيانات لعرض الترتيب.</td></tr>`; return; }

    rankings.forEach((r, index) => {
        let rankMedal = `<span class="text-gray-400 font-bold">${index + 1}</span>`;
        if (index === 0) rankMedal = `<i class="fa-solid fa-medal text-yellow-400 text-xl"></i>`;
        else if (index === 1) rankMedal = `<i class="fa-solid fa-medal text-gray-300 text-lg"></i>`;
        else if (index === 2) rankMedal = `<i class="fa-solid fa-medal text-orange-400 text-lg"></i>`;

        let percColor = r.percentage >= 80 ? 'text-green-400' : (r.percentage >= 50 ? 'text-yellow-400' : 'text-red-400');
        rankBody.innerHTML += `<tr class="${index < 3 ? 'bg-[rgba(201,168,76,0.05)]' : ''}"><td class="p-4 text-center">${rankMedal}</td><td class="p-4 font-bold text-white">${r.name}</td><td class="p-4 text-gray-400">${r.group || '-'}</td><td class="p-4 text-center font-mono font-bold ${percColor}">${r.percentage}%</td><td class="p-4 text-center font-bold text-[var(--gold)] text-lg">${r.points}</td></tr>`;
    });
}