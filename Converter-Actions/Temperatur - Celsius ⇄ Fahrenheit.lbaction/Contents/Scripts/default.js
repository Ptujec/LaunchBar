// Calculation Celius into Fahrenheit and vise versa

function run(argument) {
  let fahrenheit = (argument * 9) / 5 + 32;
  let celsius = ((argument - 32) * 5) / 9;

  return [
    {
      title: fahrenheit.toFixed(1).replace('.', ',') + ' °F',
      subtitle: argument.replace('.', ',') + ' °C',
      icon: 'ThermoTemplate',
    },
    {
      title: celsius.toFixed(1).replace('.', ',') + ' °C',
      subtitle: argument.replace('.', ',') + ' °F',
      icon: 'ThermoTemplate',
    },
  ];
}
