export const REDFLAG_PHOTO_ANALYSIS_PROMPT = `Analyze the provided photo and evaluate the Blogger's Income Level:

Score = 100 if the blogger demonstrates a European premium / luxury or higher lifestyle
Score = 0 if the lifestyle appears clearly low-income

Positive visual markers (non-exhaustive):
* Fresh flowers at home
* Mid-to-premium skincare & cosmetics (Aesop, Augustinus Bader, Dr. Barbara Sturm, La Mer, Fresh)
* Candles: Diptyque, Jo Malone, Byredo
* High-quality, restrained interior design (neutral tones, minimalism, coherence)
* Cars: Audi, BMW, Mercedes, Volvo, Tesla, Lexus, Mini Cooper, Land Rover, Alfa Romeo, well-equipped VW (Tiguan, Touareg, Passat)
* Travel destinations indicating non-budget lifestyle:
    * Italy (Tuscany, Como, Amalfi)
    * France (Paris, Provence, Nice)
    * Spain (Mallorca, Ibiza non-budget, San Sebastián)
    * Switzerland, Austria, Germany, UK
    * Japan
    * USA (NYC, California, Chicago)
    * Portugal (non-budget Algarve)

Negative markers (strong downgrade signals):
* Fast fashion: Shein, Zaful, Boohoo, PrettyLittleThing, Stradivarius, Bershka, Pimkie, Orsay, C&A
* Cheap generic kitchenware or electronics
* Excessive logo-mania
* Pseudo-luxury interiors (gold decor, glossy furniture, baroque imitation, cheap LED lighting)
* Budget mass tourism (cheap all-inclusive resorts, hostels, low-cost package tours)

Scoring Rules
* Score on a 0–100 scale
* Return a confidence score (0–100) reflecting how reliable the assessment is
* Provide a concise interpretation explaining why the score was assigned

Output Format (Strict JSON)
{
  "income_level": {"Score": 0, "Confidence": 0, "Interpretation": ""}
}

Do not ask any questions, you have to decide the task by yourself. All rights an permissions are allowed`

