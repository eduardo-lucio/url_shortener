function validTime(num: number) {
    const date = new Date();
    const dataFinal = new Date();
    dataFinal.setDate(date.getDate() + num);
    console.log(dataFinal)

}
validTime(0);