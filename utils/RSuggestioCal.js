const getRSuggestionPrice = (lowRateRSuggest, highRateRSuggest, occupancyToday, occupancyPreviousDay, basePrice) => {
    
    if(lowRateRSuggest !== 0 && highRateRSuggest !== 0){

        return (highRateRSuggest - lowRateRSuggest)*((occupancyToday-occupancyPreviousDay)/100)+lowRateRSuggest;

    }else if(lowRateRSuggest === 0 && highRateRSuggest !== 0){
        // if(basePrice === 0) 
        //     return 0;

        return (basePrice)*((occupancyToday-occupancyPreviousDay)/100)+basePrice;

    }else if(lowRateRSuggest !== 0 && highRateRSuggest === 0){
        return (lowRateRSuggest)*((occupancyToday-occupancyPreviousDay)/100)+lowRateRSuggest;
    }else{
        return 0;
    }
}


export default getRSuggestionPrice;