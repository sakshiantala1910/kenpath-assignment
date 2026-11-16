import type { Client, InStatement } from "@libsql/client";
import bcrypt from "bcryptjs";
import type { AiUse, Application, EventAction, Role, Stage } from "./types";

// Demo logins (also listed in README). Change these before any real deployment.
const USERS = [
  { id: 1, username: "lekhpal", password: "Lekhpal@2026", name: "रमेश कुमार यादव", role: "lekhpal" },
  { id: 2, username: "tehsildar", password: "Tehsildar@2026", name: "सुनीता वर्मा", role: "tehsildar" },
] as const;

const LEKHPAL = USERS[0].name;
const TEHSILDAR = USERS[1].name;
const DAY = 86_400_000;

type SeedEvent = {
  daysAgo: number;
  actorName: string;
  actorRole: Role | "applicant" | "system";
  action: EventAction;
  from: Stage | null;
  to: Stage | null;
  note?: string;
  aiUse?: AiUse;
};

const iso = (daysAgo: number, now: number) => new Date(now - daysAgo * DAY).toISOString();

const base = {
  tehsil: "नवाबगंज",
  district: "बाराबंकी",
  slaDays: 15,
  round: 1,
};

function activeCases(now: number): { app: Application; events: SeedEvent[] }[] {
  const submitted = (d: number): SeedEvent => ({
    daysAgo: d,
    actorName: "जनसेवा केंद्र",
    actorRole: "applicant",
    action: "submitted",
    from: null,
    to: "doc_check",
    note: "ई-डिस्ट्रिक्ट पोर्टल पर आवेदन प्राप्त",
  });
  const docPassed = (d: number, note: string): SeedEvent => ({
    daysAgo: d,
    actorName: LEKHPAL,
    actorRole: "lekhpal",
    action: "doc_check_passed",
    from: "doc_check",
    to: "field_verification",
    note,
    aiUse: "accepted",
  });

  return [
    {
      app: {
        ...base,
        id: "IC/2026/1041",
        applicantName: "सीता देवी",
        relationName: "राम प्रसाद (पति)",
        gender: "F",
        mobile: "98XXXXX412",
        village: "मसौली",
        purpose: "scholarship",
        neededBy: iso(-3, now),
        declaredIncome: 60000,
        incomeSources: [
          { source: "wages", amount: 48000 },
          { source: "agriculture", amount: 12000 },
        ],
        familySize: 5,
        documents: [
          { type: "aadhaar", text: "भारत सरकार / Government of India\nसीता देवी / Seeta Devi\nजन्म तिथि / DOB: 12/03/1984\nमहिला / FEMALE\nपता: W/O राम प्रसाद, ग्राम मसौली, बाराबंकी, उ.प्र. 225204\nXXXX XXXX 4417" },
          { type: "ration_card", text: "राशन कार्ड (अंत्योदय)\nकार्ड सं. 2196XXXX0457\nमुखिया: सीता देवी\nसदस्य: राम प्रसाद (पति), सोनी (पुत्री), मोनू (पुत्र), रज्जो देवी (सास)\nकुल सदस्य: 5\nग्राम मसौली, विकास खंड मसौली" },
          { type: "self_declaration", text: "स्व-घोषणा पत्र\nमैं सीता देवी पत्नी राम प्रसाद, निवासी ग्राम मसौली, घोषणा करती हूँ कि मेरे परिवार की समस्त स्रोतों से वार्षिक आय ₹60,000 (साठ हज़ार) है। आय का स्रोत: मज़दूरी एवं कृषि।\nहस्ताक्षर/अंगूठा निशान: सीता देवी\nदिनांक: 05/11/2026" },
          { type: "khatauni", text: "खतौनी (उद्धरण)\nग्राम: मसौली, खाता सं. 00112\nखातेदार: राम प्रसाद पुत्र स्व. बुद्धू\nगाटा सं. 341, क्षेत्रफल 0.210 हे.\nफसली वर्ष 1433-1438" },
        ],
        submittedAt: iso(11, now),
        stage: "doc_check",
        updatedAt: iso(11, now),
      },
      events: [submitted(11)],
    },
    {
      app: {
        ...base,
        id: "IC/2026/1047",
        applicantName: "मोहम्मद आरिफ़",
        relationName: "अब्दुल रशीद (पिता)",
        gender: "M",
        mobile: "97XXXXX018",
        village: "देवा",
        purpose: "ews",
        declaredIncome: 120000,
        incomeSources: [{ source: "salary", amount: 120000 }],
        familySize: 4,
        documents: [
          { type: "aadhaar", text: "भारत सरकार / Government of India\nमोहम्मद आरिफ़ / Mohd Arif\nजन्म तिथि / DOB: 02/08/1996\nपुरुष / MALE\nपता: S/O अब्दुल रशीद, मोहल्ला क़स्बा, देवा, बाराबंकी 225301" },
          { type: "family_register", text: "परिवार रजिस्टर नकल (ग्राम पंचायत देवा)\nपरिवार सं. 214\nमुखिया: अब्दुल रशीद\nसदस्य: अब्दुल रशीद, नसीम बानो, मोहम्मद आरिफ़, रुख़सार\nकुल सदस्य: 4" },
          { type: "self_declaration", text: "स्व-घोषणा पत्र\nमैं मोहम्मद आरिफ़ पुत्र अब्दुल रशीद घोषणा करता हूँ कि मेरे परिवार की वार्षिक आय ₹1,20,000 है। मैं प्राइवेट नौकरी करता हूँ।\nहस्ताक्षर: Mohd Arif\nदिनांक: 28/10/2026" },
          { type: "salary_slip", text: "SAI LOGISTICS PVT LTD, Chinhat, Lucknow\nPay Slip for the month of September 2026\nEmployee: MOHD ARIF   Emp Code: SL-2291\nDesignation: Warehouse Supervisor\nBasic: 16,000  HRA: 6,400  Conveyance: 3,600\nGross Earnings: 26,000\nPF: 1,500\nNet Pay: 24,500" },
        ],
        submittedAt: iso(17, now),
        stage: "doc_check",
        updatedAt: iso(17, now),
      },
      events: [submitted(17)],
    },
    {
      app: {
        ...base,
        id: "IC/2026/1052",
        applicantName: "पूजा कुमारी",
        relationName: "सुरेश चंद्र (पिता)",
        gender: "F",
        mobile: "63XXXXX771",
        village: "सफ़दरगंज",
        purpose: "admission",
        neededBy: iso(-9, now),
        declaredIncome: 90000,
        incomeSources: [
          { source: "agriculture", amount: 55000 },
          { source: "wages", amount: 30000 },
        ],
        familySize: 6,
        documents: [
          { type: "aadhaar", text: "भारत सरकार / Government of India\nपूजा कुमारी / Puja Kumari\nजन्म तिथि / DOB: 19/06/2008\nमहिला / FEMALE\nपता: D/O सुरेश चंद्र, ग्राम सफ़दरगंज, बाराबंकी 225123" },
          { type: "khatauni", text: "खतौनी (उद्धरण)\nग्राम: सफ़दरगंज, खाता सं. 00387\nखातेदार: सुरेश चन्द्र पुत्र रामखेलावन\nगाटा सं. 118 क्षेत्रफल 0.405 हे., गाटा सं. 122 क्षेत्रफल 0.120 हे." },
        ],
        submittedAt: iso(4, now),
        stage: "doc_check",
        updatedAt: iso(4, now),
      },
      events: [submitted(4)],
    },
    {
      app: {
        ...base,
        id: "IC/2026/1033",
        applicantName: "राजेश सिंह",
        relationName: "हरिनाथ सिंह (पिता)",
        gender: "M",
        mobile: "94XXXXX230",
        village: "कुर्सी",
        purpose: "pension",
        declaredIncome: 36000,
        incomeSources: [{ source: "agriculture", amount: 36000 }],
        familySize: 2,
        documents: [
          { type: "aadhaar", text: "भारत सरकार\nराजेश सिंह / Rajesh Singh\nजन्म तिथि / DOB: 01/01/1961\nपुरुष / MALE\nपता: S/O हरिनाथ सिंह, ग्राम कुर्सी, बाराबंकी" },
          { type: "ration_card", text: "राशन कार्ड (पात्र गृहस्थी)\nमुखिया: राजेश सिंह\nसदस्य: राजेश सिंह, कमला सिंह (पत्नी)\nकुल सदस्य: 2" },
          { type: "self_declaration", text: "स्व-घोषणा पत्र\nमैं राजेश सिंह पुत्र हरिनाथ सिंह, उम्र 65 वर्ष, घोषणा करता हूँ कि मेरी वार्षिक आय ₹36,000 है जो खेती से है। मेरे पुत्र अलग रहते हैं।\nदिनांक: 30/10/2026" },
          { type: "khatauni", text: "खतौनी (उद्धरण)\nग्राम कुर्सी, खाता सं. 00045\nखातेदार: राजेश सिंह पुत्र हरिनाथ सिंह\nगाटा सं. 77 क्षेत्रफल 0.506 हे." },
        ],
        submittedAt: iso(13, now),
        stage: "field_verification",
        docCheck: {
          checklist: { aadhaar: true, ration_card: true, self_declaration: true, khatauni: true },
          remarks: "सभी आवश्यक अभिलेख संलग्न। स्थलीय सत्यापन हेतु।",
        },
        updatedAt: iso(10, now),
      },
      events: [submitted(13), docPassed(10, "सभी आवश्यक अभिलेख संलग्न। स्थलीय सत्यापन हेतु।")],
    },
    {
      app: {
        ...base,
        id: "IC/2026/1029",
        applicantName: "गीता यादव",
        relationName: "स्व. मुन्ना लाल यादव (पति)",
        gender: "F",
        mobile: "88XXXXX905",
        village: "बड़ागाँव",
        purpose: "pension",
        declaredIncome: 30000,
        incomeSources: [{ source: "wages", amount: 30000 }],
        familySize: 3,
        documents: [
          { type: "aadhaar", text: "भारत सरकार\nगीता यादव / Geeta Yadav\nजन्म तिथि / DOB: 15/07/1979\nमहिला / FEMALE\nपता: W/O मुन्ना लाल यादव, ग्राम बड़ागाँव, बाराबंकी" },
          { type: "ration_card", text: "राशन कार्ड (अंत्योदय)\nमुखिया: गीता यादव\nसदस्य: गीता यादव, अजय (पुत्र), प्रिया (पुत्री)\nकुल सदस्य: 3" },
          { type: "self_declaration", text: "स्व-घोषणा पत्र\nमैं गीता यादव पत्नी स्व. मुन्ना लाल यादव घोषणा करती हूँ कि पति की मृत्यु के बाद मैं मज़दूरी करती हूँ, वार्षिक आय लगभग ₹30,000 है।\nअंगूठा निशान\nदिनांक: 25/10/2026" },
        ],
        submittedAt: iso(18, now),
        stage: "field_verification",
        docCheck: {
          checklist: { aadhaar: true, ration_card: true, self_declaration: true },
          remarks: "मृत्यु प्रमाण पत्र की प्रति स्थलीय सत्यापन के समय देखी जाए।",
        },
        updatedAt: iso(14, now),
      },
      events: [submitted(18), docPassed(14, "मृत्यु प्रमाण पत्र की प्रति स्थलीय सत्यापन के समय देखी जाए।")],
    },
    {
      app: {
        ...base,
        id: "IC/2026/1038",
        applicantName: "अंकित वर्मा",
        relationName: "विनोद वर्मा (पिता)",
        gender: "M",
        mobile: "70XXXXX386",
        village: "मसौली",
        purpose: "scholarship",
        neededBy: iso(-5, now),
        declaredIncome: 72000,
        incomeSources: [
          { source: "agriculture", amount: 42000 },
          { source: "wages", amount: 30000 },
        ],
        familySize: 5,
        documents: [
          { type: "aadhaar", text: "भारत सरकार\nअंकित वर्मा / Ankit Verma\nजन्म तिथि / DOB: 10/02/2007\nपुरुष / MALE\nपता: S/O विनोद वर्मा, ग्राम मसौली, बाराबंकी" },
          { type: "ration_card", text: "राशन कार्ड (पात्र गृहस्थी)\nमुखिया: विनोद वर्मा\nसदस्य: विनोद वर्मा, सरोज वर्मा, अंकित वर्मा, अंजलि, अमन\nकुल सदस्य: 5" },
          { type: "self_declaration", text: "स्व-घोषणा पत्र\nमैं अंकित वर्मा पुत्र विनोद वर्मा घोषणा करता हूँ कि मेरे परिवार की वार्षिक आय ₹72,000 है (खेती ₹42,000, मज़दूरी ₹30,000)।\nदिनांक: 01/11/2026" },
          { type: "khatauni", text: "खतौनी (उद्धरण)\nग्राम मसौली, खाता सं. 00219\nखातेदार: विनोद वर्मा पुत्र शिवनाथ\nगाटा सं. 402 क्षेत्रफल 0.330 हे." },
        ],
        submittedAt: iso(12, now),
        stage: "decision",
        docCheck: {
          checklist: { aadhaar: true, ration_card: true, self_declaration: true, khatauni: true },
          remarks: "अभिलेख पूर्ण।",
        },
        fieldReport: {
          notes: "gaon gaya, vinod verma se mila. 0.33 hectare kheti gehu dhan. vinod mazdoori bhi karta hai mandi me. pakka ghar nahi, 1 bhains.",
          report: "आख्या\nमौके पर जाँच की गई। आवेदक के पिता श्री विनोद वर्मा के नाम ग्राम मसौली में 0.330 हे. कृषि भूमि (गाटा सं. 402) है जिस पर गेहूँ एवं धान की खेती होती है, जिससे अनुमानित वार्षिक आय ₹42,000 है। श्री विनोद वर्मा मंडी में मज़दूरी भी करते हैं जिससे लगभग ₹30,000 वार्षिक आय होती है। परिवार कच्चे मकान में रहता है तथा एक भैंस है। परिवार की समस्त स्रोतों से कुल वार्षिक आय ₹72,000 पाई गई, जो घोषित आय के अनुरूप है।\nआख्या सादर प्रेषित।",
          verifiedIncome: 72000,
          visitedOn: iso(4, now),
        },
        updatedAt: iso(3, now),
      },
      events: [
        submitted(12),
        docPassed(9, "अभिलेख पूर्ण।"),
        { daysAgo: 3, actorName: LEKHPAL, actorRole: "lekhpal", action: "field_report_submitted", from: "field_verification", to: "decision", note: "सत्यापित आय ₹72,000 — घोषित आय के अनुरूप।", aiUse: "edited" },
      ],
    },
    {
      app: {
        ...base,
        id: "IC/2026/1025",
        applicantName: "शबनम बानो",
        relationName: "इरफ़ान अहमद (पति)",
        gender: "F",
        mobile: "99XXXXX564",
        village: "देवा",
        purpose: "ews",
        declaredIncome: 50000,
        incomeSources: [{ source: "wages", amount: 50000 }],
        familySize: 4,
        documents: [
          { type: "aadhaar", text: "भारत सरकार\nशबनम बानो / Shabnam Bano\nजन्म तिथि / DOB: 23/09/1990\nमहिला / FEMALE\nपता: W/O इरफ़ान अहमद, देवा, बाराबंकी" },
          { type: "family_register", text: "परिवार रजिस्टर नकल\nमुखिया: इरफ़ान अहमद\nसदस्य: इरफ़ान अहमद, शबनम बानो, ज़ैद, आलिया\nकुल सदस्य: 4" },
          { type: "self_declaration", text: "स्व-घोषणा पत्र\nमैं शबनम बानो घोषणा करती हूँ कि परिवार की वार्षिक आय ₹50,000 है, पति मज़दूरी करते हैं।\nदिनांक: 27/10/2026" },
        ],
        submittedAt: iso(14, now),
        stage: "decision",
        docCheck: {
          checklist: { aadhaar: true, family_register: true, self_declaration: true },
          remarks: "अभिलेख पूर्ण, आय का कोई प्रमाण संलग्न नहीं — स्थलीय सत्यापन आवश्यक।",
        },
        fieldReport: {
          notes: "irfan ki devā chauraha par silai ki dukaan hai, 2 karigar rakhe hain. padosiyon ne bataya mahine ka 10-12 hazar bachat. ghar pakka 2 manzil. majdoori wali baat sahi nahi lagi",
          report: "आख्या\nमौके पर जाँच व पड़ोसियों से पूछताछ की गई। आवेदिका के पति श्री इरफ़ान अहमद की देवा चौराहे पर सिलाई की दुकान है जिसमें दो कारीगर कार्यरत हैं। पूछताछ में मासिक शुद्ध आय लगभग ₹10,000–12,000 बताई गई, अतः अनुमानित वार्षिक आय लगभग ₹1,40,000 है। परिवार दो-मंज़िला पक्के मकान में रहता है। स्व-घोषणा पत्र में बताया गया मज़दूरी का स्रोत मौके पर सही नहीं पाया गया।\nपरिवार की सत्यापित वार्षिक आय ₹1,40,000 है।\nआख्या सादर प्रेषित।",
          verifiedIncome: 140000,
          visitedOn: iso(6, now),
        },
        updatedAt: iso(5, now),
      },
      events: [
        submitted(14),
        docPassed(11, "अभिलेख पूर्ण, आय का कोई प्रमाण संलग्न नहीं — स्थलीय सत्यापन आवश्यक।"),
        { daysAgo: 5, actorName: LEKHPAL, actorRole: "lekhpal", action: "field_report_submitted", from: "field_verification", to: "decision", note: "सत्यापित आय ₹1,40,000 — घोषित ₹50,000 से अधिक।", aiUse: "edited" },
      ],
    },
    {
      app: {
        ...base,
        id: "IC/2026/1056",
        applicantName: "कमला देवी",
        relationName: "श्याम लाल (पति)",
        gender: "F",
        mobile: "81XXXXX147",
        village: "कुर्सी",
        purpose: "other",
        declaredIncome: 45000,
        incomeSources: [{ source: "agriculture", amount: 45000 }],
        familySize: 3,
        documents: [
          { type: "aadhaar", text: "भारत सरकार\nकमला देवी / Kamla Devi\nजन्म तिथि / DOB: 04/04/1975\nमहिला / FEMALE\nपता: W/O श्याम लाल, ग्राम कुर्सी, बाराबंकी" },
          { type: "ration_card", text: "राशन कार्ड (पात्र गृहस्थी)\nमुखिया: कमला देवी\nसदस्य: कमला देवी, श्याम लाल, राजू\nकुल सदस्य: 3" },
          { type: "khatauni", text: "खतौनी (उद्धरण)\nग्राम कुर्सी, खाता सं. 00301\nखातेदार: श्याम लाल पुत्र गया प्रसाद\nगाटा सं. 55 क्षेत्रफल 0.290 हे." },
        ],
        submittedAt: iso(6, now),
        stage: "returned",
        returnReason: "स्व-घोषणा पत्र संलग्न नहीं है। कृपया हस्ताक्षरित स्व-घोषणा पत्र अपलोड कर पुनः जमा करें।",
        updatedAt: iso(2, now),
      },
      events: [
        submitted(6),
        { daysAgo: 2, actorName: LEKHPAL, actorRole: "lekhpal", action: "returned_to_applicant", from: "doc_check", to: "returned", note: "स्व-घोषणा पत्र संलग्न नहीं है। कृपया हस्ताक्षरित स्व-घोषणा पत्र अपलोड कर पुनः जमा करें।", aiUse: "edited" },
      ],
    },
  ];
}

// Closed files from the past weeks, so the impact page has a baseline to show
function closedCases(now: number): { app: Application; events: SeedEvent[] }[] {
  const people = [
    ["रीना देवी", "F", "मसौली"], ["सुनील कुमार", "M", "देवा"], ["अनीता", "F", "कुर्सी"],
    ["राम सजीवन", "M", "बड़ागाँव"], ["फ़ातिमा", "F", "देवा"], ["दिनेश पाल", "M", "सफ़दरगंज"],
    ["संगीता मौर्य", "F", "मसौली"], ["विजय बहादुर", "M", "कुर्सी"], ["नेहा सिंह", "F", "बड़ागाँव"],
    ["अशोक रावत", "M", "सफ़दरगंज"],
  ] as const;
  const aiPattern: AiUse[] = ["accepted", "edited", "edited", "accepted", "overridden", "edited", "accepted", "edited", "ignored", "accepted"];

  return people.map(([name, gender, village], i) => {
    const start = 22 + i * 3;
    const docDays = 2 + (i % 4);
    const fieldDays = 3 + ((i * 2) % 5);
    const decideDays = 1 + (i % 3);
    const returned = i % 4 === 1;
    const rejected = i === 6;
    const income = 30000 + i * 9000;
    const events: SeedEvent[] = [
      { daysAgo: start, actorName: "जनसेवा केंद्र", actorRole: "applicant", action: "submitted", from: null, to: "doc_check" },
    ];
    let t = start - docDays;
    if (returned) {
      events.push({ daysAgo: t, actorName: LEKHPAL, actorRole: "lekhpal", action: "returned_to_applicant", from: "doc_check", to: "returned", note: "स्व-घोषणा पत्र अपूर्ण।", aiUse: aiPattern[i] });
      t -= 3;
      events.push({ daysAgo: t, actorName: "जनसेवा केंद्र", actorRole: "applicant", action: "resubmitted", from: "returned", to: "doc_check" });
      t -= 1;
    }
    events.push({ daysAgo: t, actorName: LEKHPAL, actorRole: "lekhpal", action: "doc_check_passed", from: "doc_check", to: "field_verification", aiUse: aiPattern[i] });
    t -= fieldDays;
    events.push({ daysAgo: t, actorName: LEKHPAL, actorRole: "lekhpal", action: "field_report_submitted", from: "field_verification", to: "decision", note: `सत्यापित आय ₹${income.toLocaleString("en-IN")}`, aiUse: aiPattern[(i + 3) % 10] });
    t -= decideDays;
    events.push({
      daysAgo: t,
      actorName: TEHSILDAR,
      actorRole: "tehsildar",
      action: rejected ? "rejected" : "approved",
      from: "decision",
      to: rejected ? "rejected" : "approved",
      note: rejected ? "आवेदक ग्राम का निवासी नहीं पाया गया।" : "आय प्रमाण पत्र जारी।",
      aiUse: aiPattern[(i + 5) % 10],
    });

    const app: Application = {
      ...base,
      id: `IC/2026/${String(940 + i * 7).padStart(4, "0")}`,
      applicantName: name,
      relationName: "—",
      gender,
      mobile: "9XXXXXXXXX",
      village,
      purpose: (["scholarship", "ews", "pension", "admission", "other"] as const)[i % 5],
      declaredIncome: income,
      incomeSources: [{ source: "agriculture", amount: income }],
      familySize: 3 + (i % 4),
      documents: [],
      submittedAt: iso(start, now),
      stage: rejected ? "rejected" : "approved",
      round: returned ? 2 : 1,
      decision: {
        outcome: rejected ? "rejected" : "approved",
        reason: rejected ? "आवेदक ग्राम का निवासी नहीं पाया गया।" : "आय प्रमाण पत्र जारी।",
        certificateNo: rejected ? undefined : `UP-BBK-IC-${2026}${String(5100 + i)}`,
        at: iso(t, now),
        by: TEHSILDAR,
      },
      fieldReport: { notes: "", report: "", verifiedIncome: income, visitedOn: iso(t + decideDays, now) },
      updatedAt: iso(t, now),
    };
    return { app, events };
  });
}

export async function seed(c: Client) {
  const now = Date.now();
  const stmts: InStatement[] = USERS.map((u) => ({
    sql: "INSERT INTO users (id, username, password_hash, name, role) VALUES (?, ?, ?, ?, ?)",
    args: [u.id, u.username, bcrypt.hashSync(u.password, 10), u.name, u.role],
  }));

  for (const { app, events } of [...activeCases(now), ...closedCases(now)]) {
    stmts.push({
      sql: "INSERT INTO applications (id, stage, submitted_at, updated_at, data) VALUES (?, ?, ?, ?, ?)",
      args: [app.id, app.stage, app.submittedAt, app.updatedAt, JSON.stringify(app)],
    });
    for (const e of events) {
      stmts.push({
        sql: `INSERT INTO events (application_id, at, actor_name, actor_role, action, from_stage, to_stage, note, ai_use)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [app.id, iso(e.daysAgo, now), e.actorName, e.actorRole, e.action, e.from, e.to, e.note ?? "", e.aiUse ?? null],
      });
    }
  }
  await c.batch(stmts, "write");
}
