// ==================== حماية الصفحة ====================
const sessionData = localStorage.getItem('scout_leader_session');
if (!sessionData) {
    window.location.href = 'index.html'; 
}
const currentUser = JSON.parse(sessionData);

// تشغيل الفلترة وجلب البيانات أول ما الصفحة تفتح
document.addEventListener('DOMContentLoaded', () => {
    applyRoleRestrictions();
    fetchScouts();
});

// ==================== إعدادات الاتصال بـ Supabase ====================
const SUPABASE_URL = 'https://xbdprjxvtwfieiqncbez.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiZHByanh2dHdmaWVpcW5jYmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjI2NDgsImV4cCI6MjA5NTI5ODY0OH0.ptteVMU6OYawOqiQinKg2FQ_fpP-_VdG3BJY6alkgXM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allScouts = [];
let currentFilterStage = 'الكل';

// ==================== الصور من جوجل درايف ====================
function getDirectDriveLink(url) {
    if (!url || url.trim() === '') return 'https://via.placeholder.com/150?text=No+Image';
    const match = url.match(/(?:id=|d\/)([\w-]{25,33})/);
    if (match && match[1]) {
        const driveLink = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
        return `https://wsrv.nl/?url=${encodeURIComponent(driveLink)}&output=webp`;
    }
    return 'https://via.placeholder.com/150?text=No+Image';
}

// ==================== بنحدد الكشاف ده في أنهي فرقة ====================
function getScoutStage(schoolStage, gender) {
    if (!schoolStage) return 'مش محدد';
    const stage = schoolStage.trim();
    const g = gender ? gender.trim() : '';
    if (stage === 'براعم') return 'براعم';
    else if (stage === 'ابتدائي' && g === 'ولد') return 'أشبال';
    else if (stage === 'ابتدائي' && g === 'بنت') return 'زهرات';
    else if (stage === 'اعدادي' && g === 'ولد') return 'كشاف مبتدئ';
    else if (stage === 'اعدادي' && g === 'بنت') return 'مرشدات';
    else if (stage === 'ثانوي' && g === 'ولد') return 'كشاف متقدم';
    else if (stage === 'ثانوي' && g === 'بنت') return 'رائدات';
    else return 'مش محدد';
}

// ==================== دالة التحكم في إظهار وإخفاء التابات والزراير ====================
function applyRoleRestrictions() {
    if (currentUser.role === 'Viewer') {
        const addBtn = document.getElementById('addScoutBtn'); 
        if (addBtn) addBtn.style.display = 'none';
    }

    if (currentUser.role === 'TroopLeader') {
        const tabBtns = document.querySelectorAll('.tab-btn'); 
        let allowedTabs = ['الكل'];

        const primaryStage = ['أشبال', 'زهرات'];
        const prepStage = ['كشاف مبتدئ', 'مرشدات'];
        const secStage = ['كشاف متقدم', 'رائدات'];

        if (primaryStage.includes(currentUser.troop)) {
            allowedTabs.push(...primaryStage);
        } else if (prepStage.includes(currentUser.troop)) {
            allowedTabs.push(...prepStage);
        } else if (secStage.includes(currentUser.troop)) {
            allowedTabs.push(...secStage);
        } else {
            allowedTabs.push(currentUser.troop); 
        }

        tabBtns.forEach(btn => {
            const tabName = btn.innerText.trim();
            if (!allowedTabs.includes(tabName)) {
                btn.style.display = 'none';
            }
        });
    }
}

// ==================== بنجيب الكشافة من الداتابيز ====================
async function fetchScouts() {
    // Non-admin users should only see scouts with status 'مقبول'.
    // Master/General see everything (including 'قيد الانتظار') so they can approve.
    let query;
    if (currentUser.role === 'Master' || currentUser.role === 'General') {
        query = supabaseClient.from('scouts').select('*');
    } else {
        query = supabaseClient.from('scouts').select('*').eq('status', 'مقبول');
    }

    if (currentUser.role === 'TroopLeader') {
        if (['أشبال', 'زهرات'].includes(currentUser.troop)) {
            query = query.eq('school_stage', 'ابتدائي');
        } else if (['كشاف مبتدئ', 'مرشدات'].includes(currentUser.troop)) {
            query = query.eq('school_stage', 'اعدادي');
        } else if (['كشاف متقدم', 'رائدات'].includes(currentUser.troop)) {
            query = query.eq('school_stage', 'ثانوي');
        } else {
            query = query.eq('school_stage', currentUser.troop);
        }
    }

    const { data, error } = await query;
    if (error) {
        alert('فشل التحميل: ' + error.message); 
        return;
    }

    allScouts = data.map(scout => {
        scout.scout_group = getScoutStage(scout.school_stage, scout.gender);
        return scout;
    });
    renderTable(); 
}

function generateNextScoutId() {
    if (allScouts.length === 0) return 'A00001';
    const nums = allScouts.map(s => {
        const match = s.scout_id?.match(/^A(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
    }).filter(n => !isNaN(n));

    const maxNum = Math.max(...nums);
    return `A${String(maxNum + 1).padStart(5, '0')}`;
}

// ==================== بنرسم الجدول ====================
function renderTable() {
    const tbody = document.getElementById('scoutsTableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    tbody.innerHTML = '';

    const filteredScouts = allScouts.filter(scout => {
        const matchesTab = currentFilterStage === 'الكل' || scout.scout_group === currentFilterStage;
        const searchString = `${scout.full_name} ${scout.scout_id} ${scout.personal_phone}`.toLowerCase();
        return matchesTab && searchString.includes(searchTerm);
    });

    if (filteredScouts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">مفيش نتايج...</td></tr>`;
        return;
    }

    filteredScouts.forEach(scout => {
        const imgSrc = getDirectDriveLink(scout.photo_url);
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-blue-50/40 transition duration-150 text-sm md:text-base";
        
        let actionsHtml = '';
        if (currentUser.role === 'Viewer') {
            actionsHtml = `<button onclick="viewProfile('${scout.scout_id}')" class="text-blue-600 hover:text-blue-900 text-lg" title="شوف الملف الكامل"><i class="fa-solid fa-address-card"></i></button>`;
        } else if (currentUser.role === 'TroopLeader') {
            actionsHtml = `
                <button onclick="viewProfile('${scout.scout_id}')" class="text-blue-600 hover:text-blue-900 text-lg" title="شوف الملف الكامل"><i class="fa-solid fa-address-card"></i></button>
                <button onclick="openEditModal('${scout.scout_id}')" class="text-green-600 hover:text-green-900 text-lg" title="عدّل البيانات"><i class="fa-solid fa-user-pen"></i></button>
            `;
        } else {
            actionsHtml = `
                <button onclick="viewProfile('${scout.scout_id}')" class="text-blue-600 hover:text-blue-900 text-lg" title="شوف الملف الكامل"><i class="fa-solid fa-address-card"></i></button>
                <button onclick="openEditModal('${scout.scout_id}')" class="text-green-600 hover:text-green-900 text-lg" title="عدّل البيانات"><i class="fa-solid fa-user-pen"></i></button>
                <button onclick="deleteScout('${scout.scout_id}')" class="text-red-500 hover:text-red-800 text-lg" title="امسح الكشاف ده"><i class="fa-solid fa-user-minus"></i></button>
            `;
        }

        tr.innerHTML = `
            <td class="p-4"><img src="${imgSrc}" class="w-11 h-11 rounded-full object-cover cursor-pointer border border-gray-200 shadow-sm" onclick="openImagePreview('${imgSrc}')"></td>
            <td class="p-4 font-bold text-blue-900">${scout.scout_id}</td>
            <td class="p-4 font-medium text-gray-900">${scout.full_name}</td>
            <td class="p-4"><span class="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-100">${scout.scout_group || '-'}</span></td>
            <td class="p-4 text-gray-600 font-mono" dir="ltr">${scout.personal_phone || '-'}</td>
            <td class="p-4 text-center space-x-3 space-x-reverse">${actionsHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterData(stage, btnElement) {
    currentFilterStage = stage;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');
    renderTable();
}
document.getElementById('searchInput').addEventListener('input', renderTable);

// ==================== بنفتح البروفايل الكامل ====================
function viewProfile(id) {
    const scout = allScouts.find(s => s.scout_id === id);
    if (!scout) return;

    document.getElementById('modalImage').src = getDirectDriveLink(scout.photo_url);
    document.getElementById('modalName').textContent = scout.full_name;
    document.getElementById('modalID').textContent = `الكود: ${scout.scout_id}`;
    document.getElementById('modalStageBadge').textContent = scout.scout_group;

    const fieldLabels = {
        'scout_id': 'الكود الكشفي', 'full_name': 'الاسم الرباعي', 'birth_date': 'تاريخ الميلاد', 'gender': 'النوع',
        'personal_phone': 'موبايل الكشاف', 'father_phone': 'تليفون الأب', 'mother_phone': 'تليفون الأم',
        'address': 'العنوان بالكامل', 'school_stage': 'المرحلة الدراسية', 'school_year': 'السنة الدراسية',
        'personal_email': 'الإيميل بتاعه', 'facebook_account': 'أكونت الفيسبوك', 'instagram_account': 'أكونت الإنستجرام',
        'scout_uniform': 'الزي الكشفي موجود؟', 'confession_father': 'أب الاعتراف', 'confession_church': 'كنيسة أب الاعتراف',
        'father_job': 'شغل الأب', 'mother_job': 'شغل الأم', 'siblings_count': 'عدد الإخوة', 'sibling_order': 'ترتيبه بين إخواته',
        'has_diseases': 'عنده أمراض؟', 'diseases_details': 'تفاصيل الحالة الصحية', 'hobbies': 'هواياته ومهاراته', 'certificate': 'مؤهله / شهادته'
    };

    let detailsHTML = '';
    Object.keys(fieldLabels).forEach(key => {
        const label = fieldLabels[key];
        let value = scout[key];
        if (value === undefined || value === null || String(value).trim() === '') value = '-';
        let specialCardStyle = ((key === 'has_diseases' && value === 'نعم') || (key === 'diseases_details' && value !== '-')) 
                                ? 'bg-red-50 border-red-200 text-red-900' : 'bg-gray-50 border-gray-100';
        detailsHTML += `
            <div class="p-3 border rounded-lg ${specialCardStyle} flex flex-col gap-1 shadow-sm">
                <span class="text-xs font-bold text-gray-400">${label}</span>
                <span class="font-semibold break-words" ${key.includes('phone') ? 'dir="ltr" class="text-right font-mono text-xs"' : ''}>${value}</span>
            </div>
        `;
    });
    document.getElementById('modalDetails').innerHTML = detailsHTML;
    document.getElementById('profileModal').classList.remove('hidden');
}

function openImagePreview(src) { document.getElementById('fullSizeImage').src = src; document.getElementById('imageModal').classList.remove('hidden'); }
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }

// ==================== الفحص الذكي للأخطاء ====================
function validateScoutData(data) {
    let isValid = true;
    let firstErrorElement = null;

    function setError(inputId, message) {
        isValid = false;
        const inputEl = document.getElementById(inputId);
        if (inputEl) {
            inputEl.classList.add('border-red-500', 'bg-red-50');
            let errorSpan = document.getElementById(inputId + '_error');
            if (!errorSpan) {
                errorSpan = document.createElement('span');
                errorSpan.id = inputId + '_error';
                errorSpan.className = 'text-red-500 text-xs mt-1 block font-bold';
                inputEl.parentNode.insertBefore(errorSpan, inputEl.nextSibling);
            }
            errorSpan.textContent = message;
            errorSpan.style.display = 'block';
            if (!firstErrorElement) firstErrorElement = inputEl;
        }
    }

    document.querySelectorAll('.form-input').forEach(el => {
        el.classList.remove('border-red-500', 'bg-red-50');
        const errSpan = document.getElementById(el.id + '_error');
        if (errSpan) errSpan.style.display = 'none';
    });

    const nameRegex = /^[\u0600-\u06FF\s]+$/;
    const nameWords = data.full_name ? data.full_name.trim().split(/\s+/).filter(w => w.length > 0) : [];
    if (!data.full_name) setError('formFullName', 'الاسم الرباعي مطلوب يا قائد.');
    else if (!nameRegex.test(data.full_name)) setError('formFullName', 'الاسم لازم يتكتب بالعربي بس.');
    else if (nameWords.length < 3) setError('formFullName', 'لازم تكتب الاسم ثلاثي أو رباعي على الأقل.');

    const phoneRegex = /^01[0125]\d{8}$/;
    if (!data.personal_phone) setError('formPersonalPhone', 'رقم موبايل الكشاف مطلوب.');
    else if (!phoneRegex.test(data.personal_phone)) setError('formPersonalPhone', 'الرقم مش صحيح، لازم يكون 11 رقم بيبدأ بـ 01.');

    if (data.father_phone && !phoneRegex.test(data.father_phone)) setError('formFatherPhone', 'رقم موبايل الأب مش صحيح.');
    if (data.mother_phone && !phoneRegex.test(data.mother_phone)) setError('formMotherPhone', 'رقم موبايل الأم مش صحيح.');

    if (data.personal_phone && data.father_phone && data.mother_phone) {
        if (data.personal_phone === data.father_phone && data.personal_phone === data.mother_phone) {
            setError('formPersonalPhone', 'الرقم متكرر 3 مرات! سيب خانة فاضية لو مفيش.');
            setError('formFatherPhone', 'الرقم متكرر 3 مرات!');
            setError('formMotherPhone', 'الرقم متكرر 3 مرات!');
        }
    }

    if (data.address && !/\d/.test(data.address)) setError('formAddress', 'العنوان لازم يكون فيه رقم العمارة أو الشقة.');

    if (data.birth_date) {
        const age = new Date().getFullYear() - new Date(data.birth_date).getFullYear();
        if (age < 4 || age > 25) setError('formBirthDate', `السن غير منطقي (${age} سنة).`);
    }

    if (data.siblings_count && data.sibling_order) {
        if (parseInt(data.sibling_order) > parseInt(data.siblings_count)) {
            setError('formSiblingOrder', 'الترتيب مينفعش يكون أكبر من العدد الكلي!');
        }
    }

    if (!isValid && firstErrorElement) firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return isValid;
}

// ==================== بنجيب بيانات الفورم ====================
function getFormData() {
    return {
        scout_id:           document.getElementById('formScoutId').value.trim(),
        full_name:          document.getElementById('formFullName').value.trim(),
        birth_date:         document.getElementById('formBirthDate').value.trim() || null,
        gender:             document.getElementById('formGender').value || null,
        personal_phone:     document.getElementById('formPersonalPhone').value.trim(),
        father_phone:       document.getElementById('formFatherPhone').value.trim() || null,
        mother_phone:       document.getElementById('formMotherPhone').value.trim() || null,
        address:            document.getElementById('formAddress').value.trim() || null,
        school_stage:       document.getElementById('formSchoolStage').value || null,
        school_year:        document.getElementById('formSchoolYear').value.trim() || null,
        personal_email:     document.getElementById('formPersonalEmail').value.trim() || null,
        facebook_account:   document.getElementById('formFacebook').value.trim() || null,
        instagram_account:  document.getElementById('formInstagram').value.trim() || null,
        scout_uniform:      document.getElementById('formUniform').value.trim() || null,
        confession_father:  document.getElementById('formConfessionFather').value.trim() || null,
        confession_church:  document.getElementById('formConfessionChurch').value.trim() || null,
        father_job:         document.getElementById('formFatherJob').value.trim() || null,
        mother_job:         document.getElementById('formMotherJob').value.trim() || null,
        siblings_count:     document.getElementById('formSiblingsCount').value.trim() ? parseInt(document.getElementById('formSiblingsCount').value.trim()) : null,
        sibling_order:      document.getElementById('formSiblingOrder').value.trim() ? parseInt(document.getElementById('formSiblingOrder').value.trim()) : null,
        has_diseases:       document.getElementById('formHasDiseases').value || 'لا',
        diseases_details:   document.getElementById('formDiseasesDetails').value.trim() || null,
        hobbies:            document.getElementById('formHobbies').value.trim() || null,
        certificate:        document.getElementById('formCertificate').value.trim() || null,
        photo_url:          document.getElementById('formPhotoUrl').value.trim() || null
    };
}

// ==================== عمليات الإضافة والتعديل ====================
function openAddModal() {
    // Redirect to the full add form page instead of opening an in-page modal
    window.location.href = 'form.html';
}

async function submitAddScout() {
    const data = getFormData();
    if (!validateScoutData(data)) return;

    if (currentUser.role === 'Master' || currentUser.role === 'General') data.status = 'مقبول';
    else data.status = 'قيد الانتظار';

    const btn = document.getElementById('formSubmitBtn');
    btn.disabled = true; btn.textContent = 'بيتحفظ...';

    const { error } = await supabaseClient.from('scouts').insert([data]);

    if (!error) {
        alert(data.status === 'قيد الانتظار' ? `تم تسجيل الكشاف وراح لصفحة الطلبات.` : `الكشاف اتضاف علطول.`);
        closeModal('formModal');
        fetchScouts();
    } else {
        alert('مشكلة في الداتابيز: ' + error.message);
    }
    btn.disabled = false; btn.textContent = 'حفظ الكشاف';
}

function openEditModal(id) {
    const scout = allScouts.find(s => s.scout_id === id);
    if (!scout) return;

    document.getElementById('formModalTitle').textContent = 'تعديل بيانات كشاف';
    document.querySelectorAll('[id$="_error"]').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.form-input').forEach(el => el.classList.remove('border-red-500', 'bg-red-50'));
    fillFormWithScout(scout);
    document.getElementById('formSubmitBtn').textContent = 'حفظ التعديلات';
    document.getElementById('formSubmitBtn').onclick = () => submitEditScout(id);
    document.getElementById('formModal').classList.remove('hidden');
}

async function submitEditScout(id) {
    const data = getFormData();
    if (!validateScoutData(data)) return;

    const btn = document.getElementById('formSubmitBtn');
    btn.disabled = true; btn.textContent = 'بيتحفظ...';

    const { error } = await supabaseClient.from('scouts').update(data).eq('scout_id', id);

    if (!error) {
        alert('البيانات اتعدلت.');
        closeModal('formModal');
        fetchScouts();
    } else {
        alert('مشكلة في التعديل: ' + error.message);
    }
    btn.disabled = false; btn.textContent = 'حفظ التعديلات';
}

function fillFormWithScout(scout) {
    document.getElementById('formScoutId').value          = scout.scout_id || '';
    document.getElementById('formScoutIdDisplay').textContent = scout.scout_id || '';
    document.getElementById('formFullName').value         = scout.full_name || '';
    document.getElementById('formBirthDate').value        = scout.birth_date || '';
    document.getElementById('formGender').value           = scout.gender || '';
    document.getElementById('formPersonalPhone').value    = scout.personal_phone || '';
    document.getElementById('formFatherPhone').value      = scout.father_phone || '';
    document.getElementById('formMotherPhone').value      = scout.mother_phone || '';
    document.getElementById('formAddress').value          = scout.address || '';
    document.getElementById('formSchoolStage').value      = scout.school_stage || '';
    document.getElementById('formSchoolYear').value       = scout.school_year || '';
    document.getElementById('formPersonalEmail').value    = scout.personal_email || '';
    document.getElementById('formFacebook').value         = scout.facebook_account || '';
    document.getElementById('formInstagram').value        = scout.instagram_account || '';
    document.getElementById('formUniform').value          = scout.scout_uniform || '';
    document.getElementById('formConfessionFather').value = scout.confession_father || '';
    document.getElementById('formConfessionChurch').value = scout.confession_church || '';
    document.getElementById('formFatherJob').value        = scout.father_job || '';
    document.getElementById('formMotherJob').value        = scout.mother_job || '';
    document.getElementById('formSiblingsCount').value    = scout.siblings_count || '';
    document.getElementById('formSiblingOrder').value     = scout.sibling_order || '';
    document.getElementById('formHasDiseases').value      = scout.has_diseases || 'لا';
    document.getElementById('formDiseasesDetails').value  = scout.diseases_details || '';
    document.getElementById('formHobbies').value          = scout.hobbies || '';
    document.getElementById('formCertificate').value      = scout.certificate || '';
    document.getElementById('formPhotoUrl').value         = scout.photo_url || '';
}

async function deleteScout(id) {
    if (confirm(`متأكد إنك عايز تمسح الكشاف من السيستم نهائياً؟`)) {
        const { error } = await supabaseClient.from('scouts').delete().eq('scout_id', id);
        if (!error) fetchScouts();
    }
}