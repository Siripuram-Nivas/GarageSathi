const ONES = [
  'సున్నా', 'ఒకటి', 'రెండు', 'మూడు', 'నాలుగు', 'ఐదు', 'ఆరు', 'ఏడు', 'ఎనిమిది', 'తొమ్మిది',
  'పది', 'పదకొండు', 'పన్నెండు', 'పదమూడు', 'పద్నాలుగు', 'పదిహేను', 'పదహారు', 'పదిహేడు',
  'పద్దెనిమిది', 'పంతొమ్మిది',
];
const TENS = ['', '', 'ఇరవై', 'ముప్పై', 'నలభై', 'యాభై', 'అరవై', 'డెబ్బై', 'ఎనభై', 'తొంభై'];

const below100 = (n: number): string => {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return TENS[tens] + (ones ? ` ${ONES[ones]}` : '');
};

const below1000 = (n: number): string => {
  if (n < 100) return below100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = hundreds === 1 ? 'వంద' : `${ONES[hundreds]} వందల`;
  return rest ? `${head} ${below100(rest)}` : head;
};

/** Indian numbering, spoken Telugu words. Used for TTS so ₹650 is never read as raw symbols. */
export function numberToTelugu(n: number): string {
  const value = Math.max(0, Math.floor(n));
  if (value === 0) return ONES[0];
  const parts: string[] = [];
  let rest = value;
  const crore = Math.floor(rest / 10_000_000);
  rest %= 10_000_000;
  const lakh = Math.floor(rest / 100_000);
  rest %= 100_000;
  const thousand = Math.floor(rest / 1000);
  rest %= 1000;
  if (crore) parts.push(`${below1000(crore)} కోట్ల`);
  if (lakh) parts.push(`${below1000(lakh)} లక్షల`);
  if (thousand) parts.push(thousand === 1 ? 'వేయి' : `${below1000(thousand)} వేల`);
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

export function rupeesToTeluguWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const remainder = paise % 100;
  const base = `${numberToTelugu(rupees)} రూపాయలు`;
  return remainder ? `${base} ${numberToTelugu(remainder)} పైసలు` : base;
}

export function buildConfirmationText(job: { jobId: string; estimateTotalPaise: number }): string {
  return (
    `మీ సర్వీస్ రిక్వెస్ట్ నమోదు అయింది. మీ జాబ్ నంబర్ ${job.jobId}. ` +
    `మీ అంచనా సర్వీస్ మొత్తం ${rupeesToTeluguWords(job.estimateTotalPaise)}. ` +
    `తనిఖీ తర్వాత తుది ధర నిర్ధారించబడుతుంది.`
  );
}
