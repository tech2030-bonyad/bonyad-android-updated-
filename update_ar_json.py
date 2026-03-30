import json, re
with open("src/screens/ManualProjectForm.tsx", "r") as f: content = f.read()

matches = set(re.findall(r"t\(['\"]([^'\"]+)['\"]\)", content))

with open("src/localization/translations/ar.json", "r") as f: data = json.load(f)

updated = False
for m in matches:
    if m not in data:
        print(f"Adding translation: {m}")
        if m == "Phase name / Title":
            data[m] = "اسم المرحلة / العنوان"
        elif m == "Duration (days)":
            data[m] = "المدة (أيام)"
        elif m == "Amount (SAR)":
            data[m] = "المبلغ (ريال سعودي)"
        elif m == "Select category":
            data[m] = "اختر الفئة"
        elif m == "Select subcategory":
            data[m] = "اختر الفئة الفرعية"
        elif m == "Select location on map":
            data[m] = "اختر موقعك على الخريطة"
        elif m == "Optional":
            data[m] = "اختياري"
        elif m == "e.g. Design & Planning":
            data[m] = "مثال: التصميم والتخطيط"
        elif m == "Describe this phase":
            data[m] = "أدخل تفاصيل ومواصفات هذه المرحلة..."
        elif m == "e.g. 14":
            data[m] = "مثال: 14"
        elif m == "e.g. 5000":
            data[m] = "مثال: 5000"
        elif m == "Done":
            data[m] = "تم"
        else:
            data[m] = m
        updated = True

if updated:
    with open("src/localization/translations/ar.json", "w") as f: json.dump(data, f, indent=2, ensure_ascii=False)
print("Done update_ar_json")
