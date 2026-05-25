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

// ==================== بنجيب الكشافة من الداتابيز ====================
async function fetchScouts() {
    const { data, error } = await supabaseClient
        .from('scouts')
        .select('*')
        .order('scout_id', { ascending: true });

    if (error) {
        console.error('فيه مشكلة في جلب البيانات:', error);
        alert('في مشكلة وقت ما كنا بنجيب بيانات الكشافة من السيرفر، اتأكد من الكونكشن.');
        return;
    }

    allScouts = data.map(scout => ({
        ...scout,
        scout_group: getScoutStage(scout.school_stage, scout.gender)
    }));

    renderTable();
}

// ==================== بنولد كود جديد أوتوماتيك ====================
function generateNextScoutId() {
    if (allScouts.length === 0) return 'A00001';

    // بناخد كل الأرقام من الكودات الموجودة
    const nums = allScouts
        .map(s => {
            const match = s.scout_id?.match(/^A(\d+)$/i);
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n));

    const maxNum = Math.max(...nums);
    // بنحافظ على نفس عدد الخانات + 1
    const nextNum = maxNum + 1;
    const digits = String(maxNum).length;
    const padded = String(nextNum).padStart(digits, '0');
    return `A${padded}`;
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
        tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">مفيش نتايج تطابق اللي بتدور عليه...</td></tr>`;
        return;
    }

    filteredScouts.forEach(scout => {
        const imgSrc = getDirectDriveLink(scout.photo_url);
        const tr = document.createElement('tr');
        tr.className = "border-b hover:bg-blue-50/40 transition duration-150 text-sm md:text-base";
        tr.innerHTML = `
            <td class="p-4"><img src="${imgSrc}" class="w-11 h-11 rounded-full object-cover cursor-pointer border border-gray-200 shadow-sm" onclick="openImagePreview('${imgSrc}')"></td>
            <td class="p-4 font-bold text-blue-900">${scout.scout_id}</td>
            <td class="p-4 font-medium text-gray-900">${scout.full_name}</td>
            <td class="p-4"><span class="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-bold border border-blue-100">${scout.scout_group}</span></td>
            <td class="p-4 text-gray-600 font-mono" dir="ltr">${scout.personal_phone || '-'}</td>
            <td class="p-4 text-center space-x-3 space-x-reverse">
                <button onclick="viewProfile('${scout.scout_id}')" class="text-blue-600 hover:text-blue-900 text-lg" title="شوف الملف الكامل"><i class="fa-solid fa-address-card"></i></button>
                <button onclick="openEditModal('${scout.scout_id}')" class="text-green-600 hover:text-green-900 text-lg" title="عدّل البيانات"><i class="fa-solid fa-user-pen"></i></button>
                <button onclick="deleteScout('${scout.scout_id}')" class="text-red-500 hover:text-red-800 text-lg" title="امسح الكشاف ده"><i class="fa-solid fa-user-minus"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterData(stage, btnElement) {
    currentFilterStage = stage;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
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
        'scout_id': 'الكود الكشفي',
        'full_name': 'الاسم الرباعي',
        'birth_date': 'تاريخ الميلاد',
        'gender': 'النوع',
        'personal_phone': 'موبايل الكشاف',
        'father_phone': 'تليفون الأب',
        'mother_phone': 'تليفون الأم',
        'address': 'العنوان بالكامل',
        'school_stage': 'المرحلة الدراسية',
        'school_year': 'السنة الدراسية',
        'personal_email': 'الإيميل بتاعه',
        'facebook_account': 'أكونت الفيسبوك',
        'instagram_account': 'أكونت الإنستجرام',
        'scout_uniform': 'الزي الكشفي موجود؟',
        'confession_father': 'أب الاعتراف',
        'confession_church': 'كنيسة أب الاعتراف',
        'father_job': 'شغل الأب',
        'mother_job': 'شغل الأم',
        'siblings_count': 'عدد الإخوة',
        'sibling_order': 'ترتيبه بين إخواته',
        'has_diseases': 'عنده أمراض؟',
        'diseases_details': 'تفاصيل الحالة الصحية',
        'hobbies': 'هواياته ومهاراته',
        'certificate': 'مؤهله / شهادته',
        'mobile_check_status': 'حالة مراجعة الموبايل'
    };

    let detailsHTML = '';
    Object.keys(fieldLabels).forEach(key => {
        const label = fieldLabels[key];
        let value = scout[key];
        if (value === undefined || value === null || String(value).trim() === '') value = '-';
        let specialCardStyle = '';
        if ((key === 'has_diseases' && value === 'نعم') || (key === 'diseases_details' && value !== '-')) {
            specialCardStyle = 'bg-red-50 border-red-200 text-red-900';
        } else {
            specialCardStyle = 'bg-gray-50 border-gray-100';
        }
        detailsHTML += `
            <div class="p-3 border rounded-lg ${specialCardStyle} flex flex-col gap-1 shadow-sm">
                <span class="text-xs font-bold text-gray-400">${label}</span>
                <span class="font-semibold  break-words" ${key.includes('phone') ? 'dir="ltr" class="text-right font-mono text-xs"' : ''}>${value}</span>
            </div>
        `;
    });

    document.getElementById('modalDetails').innerHTML = detailsHTML;
    document.getElementById('profileModal').classList.remove('hidden');
}

function openImagePreview(src) {
    document.getElementById('fullSizeImage').src = src;
    document.getElementById('imageModal').classList.remove('hidden');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ==================== تحميل كارت PDF ====================
async function exportProfileToPDF() {
    const { jsPDF } = window.jspdf;
    const element = document.getElementById('printProfileArea');
    const scoutName = document.getElementById('modalName').textContent || 'كشاف';

    const btn = document.querySelector('[onclick="exportProfileToPDF()"]');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> بيتحمل...';
    btn.disabled = true;

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            scrollY: -window.scrollY,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth  = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin     = 10;
        const usableW    = pageWidth - margin * 2;
        const imgH       = usableW * (canvas.height / canvas.width);

        if (imgH <= pageHeight - margin * 2) {
            pdf.addImage(imgData, 'JPEG', margin, margin, usableW, imgH);
        } else {
            const pageContentH = pageHeight - margin * 2;
            let remaining = imgH;
            let srcY = 0;
            while (remaining > 0) {
                const sliceH = Math.min(remaining, pageContentH);
                const ratio  = canvas.width / usableW;
                const slice  = document.createElement('canvas');
                slice.width  = canvas.width;
                slice.height = sliceH * ratio;
                slice.getContext('2d').drawImage(canvas, 0, srcY * ratio, canvas.width, sliceH * ratio, 0, 0, canvas.width, sliceH * ratio);
                pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, usableW, sliceH);
                remaining -= pageContentH;
                srcY      += pageContentH;
                if (remaining > 0) pdf.addPage();
            }
        }

        pdf.save(`كارت_${scoutName}.pdf`);
    } catch (err) {
        console.error('مشكلة في الـ PDF:', err);
        alert('في مشكلة وقت ما كنا بنعمل الـ PDF، جرب تاني.');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

// ==================== تصدير الإكسيل ====================
function exportTableToExcel() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const exportData = allScouts.filter(scout => {
        const matchesTab = currentFilterStage === 'الكل' || scout.scout_group === currentFilterStage;
        const searchString = `${scout.full_name} ${scout.scout_id} ${scout.personal_phone}`.toLowerCase();
        return matchesTab && searchString.includes(searchTerm);
    }).map(s => ({
        'الكود الكشفي': s.scout_id,
        'الاسم الرباعي': s.full_name,
        'النوع': s.gender,
        'المرحلة الدراسية': s.school_stage,
        'الفرقة الكشفية': s.scout_group,
        'رقم الموبايل': s.personal_phone,
        'تليفون الأب': s.father_phone,
        'أب الاعتراف': s.confession_father,
        'العنوان': s.address
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الكشافة المفلترين");
    XLSX.writeFile(wb, `كشف_كشافة_${currentFilterStage}.xlsx`);
}

// ==================== مسح كشاف ====================
async function deleteScout(id) {
    const scout = allScouts.find(s => s.scout_id === id);
    if (confirm(`متأكد إنك عايز تمسح [ ${scout.full_name} ] من السيستم نهائياً؟`)) {
        const { error } = await supabaseClient.from('scouts').delete().eq('scout_id', id);
        if (!error) {
            alert('تمام، الكشاف اتمسح من الداتابيز.');
            fetchScouts();
        } else {
            alert('مش قادر يمسح، اتأكد من صلاحيات الداتابيز أو إعدادات الـ RLS.');
        }
    }
}

// ==================== فورم الإضافة ====================
function openAddModal() {
    const newId = generateNextScoutId();
    document.getElementById('formModalTitle').textContent = 'إضافة كشاف جديد';
    document.getElementById('scoutForm').reset();
    document.getElementById('formScoutId').value = newId;
    document.getElementById('formScoutIdDisplay').textContent = newId;
    document.getElementById('formSubmitBtn').textContent = 'حفظ الكشاف';
    document.getElementById('formSubmitBtn').onclick = submitAddScout;
    document.getElementById('formModal').classList.remove('hidden');
}

async function submitAddScout() {
    const data = getFormData();
    if (!data.full_name || !data.personal_phone) {
        alert('الاسم والموبايل مش ممكن يبقوا فاضيين!');
        return;
    }

    const btn = document.getElementById('formSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'بيتحفظ...';

    const { error } = await supabaseClient.from('scouts').insert([data]);

    if (!error) {
        alert(`تمام! الكشاف اتضاف بالكود ${data.scout_id}`);
        closeModal('formModal');
        fetchScouts();
    } else {
        console.error(error);
        alert('في مشكلة في الحفظ، اتأكد من الداتابيز.');
    }

    btn.disabled = false;
    btn.textContent = 'حفظ الكشاف';
}

// ==================== فورم التعديل ====================
function openEditModal(id) {
    const scout = allScouts.find(s => s.scout_id === id);
    if (!scout) return;

    document.getElementById('formModalTitle').textContent = 'تعديل بيانات كشاف';
    fillFormWithScout(scout);
    document.getElementById('formSubmitBtn').textContent = 'حفظ التعديلات';
    document.getElementById('formSubmitBtn').onclick = () => submitEditScout(id);
    document.getElementById('formModal').classList.remove('hidden');
}

async function submitEditScout(id) {
    const data = getFormData();
    if (!data.full_name || !data.personal_phone) {
        alert('الاسم والموبايل مش ممكن يبقوا فاضيين!');
        return;
    }

    const btn = document.getElementById('formSubmitBtn');
    btn.disabled = true;
    btn.textContent = 'بيتحفظ...';

    const { error } = await supabaseClient.from('scouts').update(data).eq('scout_id', id);

    if (!error) {
        alert('تمام! البيانات اتعدلت.');
        closeModal('formModal');
        fetchScouts();
    } else {
        console.error(error);
        alert('في مشكلة في التعديل، اتأكد من الداتابيز.');
    }

    btn.disabled = false;
    btn.textContent = 'حفظ التعديلات';
}

// ==================== بنجيب بيانات الفورم ====================
function getFormData() {
    return {
        scout_id:           document.getElementById('formScoutId').value.trim(),
        full_name:          document.getElementById('formFullName').value.trim(),
        birth_date:         document.getElementById('formBirthDate').value.trim(),
        gender:             document.getElementById('formGender').value,
        personal_phone:     document.getElementById('formPersonalPhone').value.trim(),
        father_phone:       document.getElementById('formFatherPhone').value.trim(),
        mother_phone:       document.getElementById('formMotherPhone').value.trim(),
        address:            document.getElementById('formAddress').value.trim(),
        school_stage:       document.getElementById('formSchoolStage').value,
        school_year:        document.getElementById('formSchoolYear').value.trim(),
        personal_email:     document.getElementById('formPersonalEmail').value.trim(),
        facebook_account:   document.getElementById('formFacebook').value.trim(),
        instagram_account:  document.getElementById('formInstagram').value.trim(),
        scout_uniform:      document.getElementById('formUniform').value.trim(),
        confession_father:  document.getElementById('formConfessionFather').value.trim(),
        confession_church:  document.getElementById('formConfessionChurch').value.trim(),
        father_job:         document.getElementById('formFatherJob').value.trim(),
        mother_job:         document.getElementById('formMotherJob').value.trim(),
        siblings_count:     document.getElementById('formSiblingsCount').value.trim(),
        sibling_order:      document.getElementById('formSiblingOrder').value.trim(),
        has_diseases:       document.getElementById('formHasDiseases').value,
        diseases_details:   document.getElementById('formDiseasesDetails').value.trim(),
        hobbies:            document.getElementById('formHobbies').value.trim(),
        certificate:        document.getElementById('formCertificate').value.trim(),
        photo_url:          document.getElementById('formPhotoUrl').value.trim(),
        mobile_check_status: document.getElementById('formMobileStatus').value.trim(),
    };
}

// ==================== بنملي الفورم ببيانات الكشاف ====================
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
    document.getElementById('formMobileStatus').value     = scout.mobile_check_status || '';
}

// ==================== يلا نشغل السيستم ====================
fetchScouts();