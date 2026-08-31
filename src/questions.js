const parallelRows = `Fourteen persons sit in two parallel rows of seven with equal spacing. In row 1, A, B, C, D, E, F and G face north. In row 2, P, Q, R, S, T, U and V face south. Each person in row 1 faces a person in row 2. D sits third to the right of G. The one who faces G sits immediately left of S. Only one person sits between S and P, who sits third to the right of T. T sits second to the left of the one facing C. As many persons sit between C and D as between P and R, who sits immediately right of U. Only two persons sit between A and E. F sits somewhere to the right of E and is not at an end. Q sits immediately right of the one who faces F.`;

const loanTable = `The table shows loan applications received by five branches and the percentage approved.\n\nBranch A: 120 applications, 75% approved\nBranch B: 150 applications, 80% approved\nBranch C: 180 applications, 70% approved\nBranch D: 210 applications, 60% approved\nBranch E: 240 applications, 90% approved`;

const q = (id, subject, topic, question, options, answer, explanation, extra = {}) => ({
  id, type: 'mcq', subject, section: subject, topic, question, options, answer, explanation,
  marks: 1, negativeMarks: 0.25, difficulty: 'Prelims', source: 'Starter bank', ...extra,
});

export const starterBank = [
  q('R001','Reasoning Ability','Parallel Rows','How many persons sit to the right of B?',['Six','Five','Three','Four','No one'],4,'B occupies the extreme right position in the solved first row.',{passage:parallelRows,source:'User-supplied Guidely PDF'}),
  q('R002','Reasoning Ability','Parallel Rows','Which pair sits at the extreme ends of the rows?',['P and D','U and B','S and E','T and G','Q and B'],4,'Q and B occupy corresponding extreme-end positions.',{passage:parallelRows,source:'User-supplied Guidely PDF'}),
  q('R003','Reasoning Ability','Parallel Rows','Who sit second from the left end of their respective rows?',['R and A','S and D','U and F','C and U','F and T'],2,'U and F occupy the second positions from the left in their rows.',{passage:parallelRows,source:'User-supplied Guidely PDF'}),
  q('R004','Reasoning Ability','Parallel Rows','Who sits third to the left of V?',['Q','The one immediately left of R','The one second to the right of Q','The one who faces C','No one'],1,'In the solved south-facing row, the required person is immediately left of R.',{passage:parallelRows,source:'User-supplied Guidely PDF'}),
  q('R005','Reasoning Ability','Parallel Rows','Who faces the person sitting second to the left of G?',['V','U','S','Q','P'],3,'Q faces the person positioned second to the left of G.',{passage:parallelRows,source:'User-supplied Guidely PDF'}),
  q('R006','Reasoning Ability','Syllogism','Statements: All pens are books. Some books are lamps. No lamp is a chair. Which conclusion definitely follows?',['Some pens are lamps','No pen is a chair','Some books are not chairs','All books are pens','Some chairs are books'],2,'The books that are lamps cannot be chairs, so some books are not chairs.'),
  q('R007','Reasoning Ability','Inequality','If P ≥ Q > R = S < T, which relation is definitely true?',['P > S','Q = T','R > T','P < R','S > Q'],0,'P is at least Q, Q is greater than R, and R equals S; therefore P is greater than S.'),
  q('R008','Reasoning Ability','Coding-Decoding','If BANK is coded as 2-1-14-11 using letter positions, how is LOAN coded?',['12-15-1-14','11-14-1-13','12-14-2-15','13-15-1-14','12-15-2-14'],0,'L=12, O=15, A=1 and N=14.'),
  q('R009','Reasoning Ability','Blood Relations','A is the mother of B. C is the father of A. D is the brother of B. How is C related to D?',['Father','Maternal grandfather','Paternal grandfather','Uncle','Brother'],1,'C is the father of D’s mother, so C is D’s maternal grandfather.'),
  q('R010','Reasoning Ability','Direction Sense','Riya walks 8 m north, turns right and walks 6 m, then turns right and walks 8 m. Where is she from the starting point?',['6 m east','6 m west','8 m north','8 m south','14 m east'],0,'The north and south movements cancel; she remains 6 m east of the start.'),
  q('R011','Reasoning Ability','Order and Ranking','Arun is 8th from the top and 15th from the bottom in a class. How many students are there?',['21','22','23','24','20'],1,'Total = 8 + 15 − 1 = 22.'),
  q('R012','Reasoning Ability','Series','Find the next term: A5, D9, G13, J17, ?',['L20','M21','M20','N21','L21'],1,'Letters advance by 3 and numbers by 4, giving M21.'),
  q('R013','Reasoning Ability','Inequality','If A < B ≤ C = D > E, which relation is definitely true?',['A < D','B > D','E > C','A = E','B < E'],0,'A < B and B ≤ C = D, so A is definitely less than D.'),
  q('R014','Reasoning Ability','Statement and Conclusion','Statement: Some officers are graduates. All graduates are readers. Which conclusion follows?',['All officers are readers','Some officers are readers','No reader is an officer','Some readers are not graduates','No conclusion follows'],1,'The officers who are graduates must also be readers.'),
  q('R015','Reasoning Ability','Odd One Out','Choose the odd one out.',['ACE','BDF','CEG','DFH','EHK'],4,'The first four groups increase each letter by two positions; EHK does not.'),
  q('R016','Reasoning Ability','Order and Ranking','In a queue of 35 people, Neha is 12th from the front. What is her position from the back?',['22nd','23rd','24th','25th','21st'],2,'Position from back = 35 − 12 + 1 = 24th.'),
  q('R017','Reasoning Ability','Data Sufficiency','What is the value of x? I. x is an even number greater than 8 and less than 12. II. x is divisible by 5.',['I alone is sufficient','II alone is sufficient','Both together are required','Either alone is sufficient','Even together they are insufficient'],0,'Statement I uniquely gives x=10. Statement II alone does not.'),
  q('R018','Reasoning Ability','Direction Sense','Aman faces west. He turns 90° clockwise, then 180° anticlockwise. Which direction does he face?',['North','South','East','West','North-east'],1,'West → clockwise to north → anticlockwise 180° to south.'),
  q('R019','Reasoning Ability','Alphabet Test','How many English letters are between the 5th letter from the left and the 8th letter from the right?',['11','12','13','14','10'],2,'The letters are E (5th) and S (19th); positions 6 through 18 contain 13 letters.'),
  q('R020','Reasoning Ability','Logical Sequence','Arrange in a logical order: 1. Interview 2. Application 3. Joining 4. Written exam 5. Selection',['2-4-1-5-3','4-2-1-5-3','2-1-4-5-3','2-4-5-1-3','4-1-2-5-3'],0,'A candidate applies, takes the written exam, attends the interview, is selected and then joins.'),

  q('Q001','Quantitative Aptitude','Simplification','What is 48% of 750 minus 35% of 400?',['180','200','210','220','240'],3,'48% of 750 is 360 and 35% of 400 is 140; 360 − 140 = 220.'),
  q('Q002','Quantitative Aptitude','Ratio','The ratio of A to B is 7:5. If their sum is 288, what is A?',['120','144','156','168','180'],3,'Twelve parts equal 288, so one part is 24 and A = 7 × 24 = 168.'),
  q('Q003','Quantitative Aptitude','Simple Interest','Find the simple interest on ₹8,000 at 7.5% per annum for 2 years.',['₹900','₹1,000','₹1,100','₹1,200','₹1,400'],3,'SI = PRT/100 = 8000 × 7.5 × 2 / 100 = ₹1,200.'),
  q('Q004','Quantitative Aptitude','Average','The average of five numbers is 42. If 54 is added as a sixth number, what is the new average?',['43','44','45','46','48'],1,'Original total = 210; new total = 264; 264/6 = 44.'),
  q('Q005','Quantitative Aptitude','Time and Distance','A 180-metre train moving at 54 km/h crosses a pole in how many seconds?',['8','10','12','14','15'],2,'54 km/h = 15 m/s, so time = 180/15 = 12 seconds.'),
  q('Q006','Quantitative Aptitude','Profit and Loss','An article is marked 25% above cost price and sold at a 10% discount on marked price. What is the profit percentage?',['10%','11.25%','12.5%','15%','17.5%'],2,'Selling price = 1.25 × 0.90 = 1.125 times cost price, giving 12.5% profit.'),
  q('Q007','Quantitative Aptitude','Percentage','A number is increased by 20% and then decreased by 20%. What is the net change?',['No change','2% decrease','4% decrease','4% increase','8% decrease'],2,'1.20 × 0.80 = 0.96, so the final value is 4% lower.'),
  q('Q008','Quantitative Aptitude','Compound Interest','What is the compound interest on ₹10,000 at 10% per annum for 2 years?',['₹2,000','₹2,100','₹2,200','₹1,900','₹2,400'],1,'Amount = 10000 × 1.1² = 12100, so compound interest is ₹2,100.'),
  q('Q009','Quantitative Aptitude','Time and Work','A can complete a job in 12 days and B in 18 days. How long will they take together?',['6 days','7.2 days','7.5 days','8 days','9 days'],1,'Combined rate = 1/12 + 1/18 = 5/36, so time = 36/5 = 7.2 days.'),
  q('Q010','Quantitative Aptitude','Mixture','In what ratio should water be mixed with milk costing ₹40 per litre so that the mixture costs ₹32 per litre?',['1:3','1:4','1:5','2:3','3:5'],1,'By alligation, water:milk = (40−32):(32−0) = 8:32 = 1:4.'),
  q('Q011','Quantitative Aptitude','Boats and Streams','A boat travels at 12 km/h downstream and 8 km/h upstream. What is the speed of the stream?',['1 km/h','2 km/h','3 km/h','4 km/h','5 km/h'],1,'Stream speed = (12 − 8)/2 = 2 km/h.'),
  q('Q012','Quantitative Aptitude','Ages','The present ages of A and B are in the ratio 4:5. After 8 years, the ratio will be 6:7. What is A’s present age?',['12','16','20','24','28'],1,'(4x+8)/(5x+8)=6/7 gives x=4, so A=16.'),
  q('Q013','Quantitative Aptitude','Number Series','Find the next number: 3, 8, 18, 38, 78, ?',['148','154','156','158','160'],3,'Each term is the previous term ×2 +2; 78×2+2=158.'),
  q('Q014','Quantitative Aptitude','Quadratic Equation','What is the larger root of x² − 9x + 20 = 0?',['3','4','5','6','8'],2,'The equation factors as (x−4)(x−5)=0; the larger root is 5.'),
  q('Q015','Quantitative Aptitude','Data Interpretation','How many loan applications were received by all five branches together?',['850','880','900','920','950'],2,'120+150+180+210+240 = 900.',{passage:loanTable}),
  q('Q016','Quantitative Aptitude','Data Interpretation','How many applications were approved by Branch C?',['108','120','126','132','144'],2,'70% of 180 = 126.',{passage:loanTable}),
  q('Q017','Quantitative Aptitude','Data Interpretation','How many applications were approved by Branches A and B together?',['190','200','210','220','230'],2,'A approved 90 and B approved 120; total = 210.',{passage:loanTable}),
  q('Q018','Quantitative Aptitude','Data Interpretation','What is the difference between approved applications in Branch E and Branch D?',['80','84','90','96','100'],2,'E approved 216 and D approved 126; difference = 90.',{passage:loanTable}),
  q('Q019','Quantitative Aptitude','Data Interpretation','What is the ratio of approved applications in Branch A to Branch C?',['5:6','5:7','6:7','7:9','10:13'],1,'A:C = 90:126 = 5:7.',{passage:loanTable}),
  q('Q020','Quantitative Aptitude','Probability','A fair die is rolled once. What is the probability of getting a number greater than 4?',['1/6','1/3','1/2','2/3','5/6'],1,'The favourable outcomes are 5 and 6, so probability = 2/6 = 1/3.'),

  q('E001','English Language','Vocabulary','Choose the word closest in meaning to “prudent”.',['Careless','Cautious','Noisy','Immediate','Rigid'],1,'Prudent means careful and showing sound judgment.'),
  q('E002','English Language','Error Detection','Choose the grammatically correct sentence.',['Neither of the reports are complete.','Neither of the reports is complete.','Neither of the report is complete.','Neither reports are complete.','Neither report were complete.'],1,'“Neither” takes a singular verb in this construction.'),
  q('E003','English Language','Fill in the Blank','The regulator introduced safeguards to _____ the risk of digital fraud.',['aggravate','mitigate','imitate','allocate','circulate'],1,'Mitigate means reduce the severity or likelihood of a risk.'),
  q('E004','English Language','Sentence Improvement','The branch manager, along with the clerks, were reviewing the applications. Choose the best correction.',['was reviewing','have reviewed','are reviewing','were reviewed','No correction'],0,'The subject is “manager”, so the singular verb “was” is required.'),
  q('E005','English Language','Para Jumble','Arrange the sentences logically: A. The bank verified her documents. B. Mira submitted a loan application. C. The amount was credited after approval. D. The credit team assessed her eligibility.',['B-A-D-C','A-B-C-D','B-D-A-C','D-A-B-C','A-D-C-B'],0,'Application comes first, then document verification, eligibility assessment and credit after approval.'),

  q('G001','General Awareness','Banking Awareness','In which year did the Reserve Bank of India begin operations?',['1930','1935','1947','1949','1951'],1,'The Reserve Bank of India commenced operations on 1 April 1935.'),
  q('G002','General Awareness','Indian Polity','Which Article of the Constitution of India provides for the Finance Commission?',['Article 110','Article 280','Article 324','Article 356','Article 368'],1,'Article 280 provides for the constitution of the Finance Commission.'),
  q('G003','General Awareness','International Institutions','Where is the headquarters of the International Monetary Fund?',['Geneva','New York','Washington, D.C.','Paris','Vienna'],2,'The IMF is headquartered in Washington, D.C.'),
  q('G004','General Awareness','Economy','What does GDP stand for?',['Gross Domestic Product','General Development Plan','Gross Development Price','Government Debt Position','Global Domestic Production'],0,'GDP stands for Gross Domestic Product.'),
  q('G005','General Awareness','Banking Awareness','NEFT in India is operated by which institution?',['SEBI','NABARD','Reserve Bank of India','NPCI only','Ministry of Finance'],2,'The NEFT payment system is owned and operated by the Reserve Bank of India.'),

  q('D001','English Language','Descriptive Writing','Write an essay on “Digital financial inclusion: opportunities and risks for India” in about 250 words.',[],null,'',{type:'descriptive',difficulty:'Mains',marks:30,negativeMarks:0,wordLimit:250,modelAnswer:'A strong response should define digital financial inclusion, explain gains in reach, cost and transparency, examine cyber-fraud, literacy, privacy and exclusion risks, and conclude with practical safeguards.',rubric:['Clear structure and thesis','Relevant banking examples','Balanced analysis','Practical recommendations','Grammar, coherence and word-limit control']}),
  q('D002','English Language','Letter Writing','Write a formal letter to a bank manager reporting repeated failure of a digital payment and requesting resolution and reversal within 200 words.',[],null,'',{type:'descriptive',difficulty:'Mains',marks:20,negativeMarks:0,wordLimit:200,modelAnswer:'The letter should include transaction references without exposing sensitive credentials, dates, amounts, the requested investigation and reversal, and a courteous request for written confirmation.',rubric:['Correct formal-letter format','Complete factual details','Clear requested remedy','Professional tone','Concise and error-free language']}),
  q('D003','English Language','Precis Writing','Write a précis of the passage in roughly one-third of its length and add a suitable title.',[],null,'',{type:'descriptive',difficulty:'Mains',marks:20,negativeMarks:0,wordLimit:120,passage:'Banks increasingly use data to assess risk, personalize services and detect fraud. These tools can improve speed and access, but poorly governed systems may reproduce historical bias or make decisions that customers cannot understand. Responsible adoption therefore requires accurate data, human oversight, clear explanations, regular audits and accessible grievance channels. Innovation and accountability are not competing goals; trustworthy systems are more likely to earn lasting adoption.',modelAnswer:'Title: Responsible Data Use in Banking. Data-driven banking can improve access, speed and fraud control, but weak governance may create bias and opaque decisions. Accurate data, human oversight, explanations, audits and grievance systems are essential. Accountability strengthens rather than obstructs sustainable innovation.',rubric:['Captures every central idea','Uses original wording','Maintains logical flow','Provides an appropriate title','Respects the target length']}),
];

export const SUBJECTS = ['Reasoning Ability', 'Quantitative Aptitude', 'English Language', 'General Awareness'];

export function normalizeImportedBank(payload) {
  const source = Array.isArray(payload) ? payload : payload?.questions;
  if (!Array.isArray(source)) throw new Error('Expected a JSON array or an object with a questions array.');
  const ids = new Set();
  return source.map((item, index) => {
    const type = item.type === 'descriptive' ? 'descriptive' : 'mcq';
    const question = String(item.question || '').trim();
    const options = Array.isArray(item.options) ? item.options.map((option) => String(option).trim()).filter(Boolean) : [];
    const answer = type === 'mcq' ? Number(item.answer) : null;
    const id = String(item.id || `IMP-${Date.now()}-${index + 1}`);
    if (!question) throw new Error(`Question ${index + 1} has no question text.`);
    if (type === 'mcq' && (options.length < 2 || options.length > 6)) throw new Error(`Question ${index + 1} must have 2–6 options.`);
    if (type === 'mcq' && (!Number.isInteger(answer) || answer < 0 || answer >= options.length)) throw new Error(`Question ${index + 1} has an invalid zero-based answer index.`);
    if (ids.has(id)) throw new Error(`Duplicate question id: ${id}`);
    ids.add(id);
    const subject = String(item.subject || 'General Awareness').trim();
    return {
      id, type, subject, section: String(item.section || subject), topic: String(item.topic || 'Imported'), question,
      options: type === 'mcq' ? options : [], answer,
      explanation: String(item.explanation || ''), modelAnswer: String(item.modelAnswer || ''),
      rubric: Array.isArray(item.rubric) ? item.rubric.map(String) : [], wordLimit: Math.max(0, Number(item.wordLimit) || 0),
      passage: item.passage ? String(item.passage) : '', difficulty: String(item.difficulty || 'Prelims'),
      marks: Math.max(0, Number(item.marks) || (type === 'mcq' ? 1 : 10)),
      negativeMarks: Math.max(0, Number(item.negativeMarks) || (type === 'mcq' ? 0.25 : 0)),
      source: String(item.source || 'Imported JSON'),
    };
  });
}
