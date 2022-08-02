const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const superagent = require('superagent');

const countries = [
  { name: 'Afghanistan', alpha2: 'AF', alpha3: 'AFG' },
  { name: 'ALA Aland Islands', alpha2: 'AX', alpha3: 'ALA' },
  { name: 'Albania', alpha2: 'AL', alpha3: 'ALB' },
  { name: 'Algeria', alpha2: 'DZ', alpha3: 'DZA' },
  { name: 'American Samoa', alpha2: 'AS', alpha3: 'ASM' },
  { name: 'Andorra', alpha2: 'AD', alpha3: 'AND' },
  { name: 'Angola', alpha2: 'AO', alpha3: 'AGO' },
  { name: 'Anguilla', alpha2: 'AI', alpha3: 'AIA' },
  { name: 'Antarctica', alpha2: 'AQ', alpha3: 'ATA' },
  { name: 'Antigua and Barbuda', alpha2: 'AG', alpha3: 'ATG' },
  { name: 'Argentina', alpha2: 'AR', alpha3: 'ARG' },
  { name: 'Armenia', alpha2: 'AM', alpha3: 'ARM' },
  { name: 'Aruba', alpha2: 'AW', alpha3: 'ABW' },
  { name: 'Australia', alpha2: 'AU', alpha3: 'AUS' },
  { name: 'Austria', alpha2: 'AT', alpha3: 'AUT' },
  { name: 'Azerbaijan', alpha2: 'AZ', alpha3: 'AZE' },
  { name: 'Bahamas', alpha2: 'BS', alpha3: 'BHS' },
  { name: 'Bahrain', alpha2: 'BH', alpha3: 'BHR' },
  { name: 'Bangladesh', alpha2: 'BD', alpha3: 'BGD' },
  { name: 'Barbados', alpha2: 'BB', alpha3: 'BRB' },
  { name: 'Belarus', alpha2: 'BY', alpha3: 'BLR' },
  { name: 'Belgium', alpha2: 'BE', alpha3: 'BEL' },
  { name: 'Belize', alpha2: 'BZ', alpha3: 'BLZ' },
  { name: 'Benin', alpha2: 'BJ', alpha3: 'BEN' },
  { name: 'Bermuda', alpha2: 'BM', alpha3: 'BMU' },
  { name: 'Bhutan', alpha2: 'BT', alpha3: 'BTN' },
  { name: 'Bolivia', alpha2: 'BO', alpha3: 'BOL' },
  { name: 'Bosnia and Herzegovina', alpha2: 'BA', alpha3: 'BIH' },
  { name: 'Botswana', alpha2: 'BW', alpha3: 'BWA' },
  { name: 'Bouvet Island', alpha2: 'BV', alpha3: 'BVT' },
  { name: 'Brazil', alpha2: 'BR', alpha3: 'BRA' },
  { name: 'British Virgin Islands', alpha2: 'VG', alpha3: 'VGB' },
  { name: 'British Indian Ocean Territory', alpha2: 'IO', alpha3: 'IOT' },
  { name: 'Brunei Darussalam', alpha2: 'BN', alpha3: 'BRN' },
  { name: 'Bulgaria', alpha2: 'BG', alpha3: 'BGR' },
  { name: 'Burkina Faso', alpha2: 'BF', alpha3: 'BFA' },
  { name: 'Burundi', alpha2: 'BI', alpha3: 'BDI' },
  { name: 'Cambodia', alpha2: 'KH', alpha3: 'KHM' },
  { name: 'Cameroon', alpha2: 'CM', alpha3: 'CMR' },
  { name: 'Canada', alpha2: 'CA', alpha3: 'CAN' },
  { name: 'Cape Verde', alpha2: 'CV', alpha3: 'CPV' },
  { name: 'Cayman Islands', alpha2: 'KY', alpha3: 'CYM' },
  { name: 'Central African Republic', alpha2: 'CF', alpha3: 'CAF' },
  { name: 'Chad', alpha2: 'TD', alpha3: 'TCD' },
  { name: 'Chile', alpha2: 'CL', alpha3: 'CHL' },
  { name: 'China', alpha2: 'CN', alpha3: 'CHN' },
  { name: 'Hong Kong, SAR China', alpha2: 'HK', alpha3: 'HKG' },
  { name: 'Macao, SAR China', alpha2: 'MO', alpha3: 'MAC' },
  { name: 'Christmas Island', alpha2: 'CX', alpha3: 'CXR' },
  { name: 'Cocos (Keeling) Islands', alpha2: 'CC', alpha3: 'CCK' },
  { name: 'Colombia', alpha2: 'CO', alpha3: 'COL' },
  { name: 'Comoros', alpha2: 'KM', alpha3: 'COM' },
  { name: 'Congo (Brazzaville)', alpha2: 'CG', alpha3: 'COG' },
  { name: 'Congo, (Kinshasa)', alpha2: 'CD', alpha3: 'COD' },
  { name: 'Cook Islands', alpha2: 'CK', alpha3: 'COK' },
  { name: 'Costa Rica', alpha2: 'CR', alpha3: 'CRI' },
  { name: 'Côte d\'Ivoire', alpha2: 'CI', alpha3: 'CIV' },
  { name: 'Croatia', alpha2: 'HR', alpha3: 'HRV' },
  { name: 'Cuba', alpha2: 'CU', alpha3: 'CUB' },
  { name: 'Cyprus', alpha2: 'CY', alpha3: 'CYP' },
  { name: 'Czech Republic', alpha2: 'CZ', alpha3: 'CZE' },
  { name: 'Denmark', alpha2: 'DK', alpha3: 'DNK' },
  { name: 'Djibouti', alpha2: 'DJ', alpha3: 'DJI' },
  { name: 'Dominica', alpha2: 'DM', alpha3: 'DMA' },
  { name: 'Dominican Republic', alpha2: 'DO', alpha3: 'DOM' },
  { name: 'Ecuador', alpha2: 'EC', alpha3: 'ECU' },
  { name: 'Egypt', alpha2: 'EG', alpha3: 'EGY' },
  { name: 'El Salvador', alpha2: 'SV', alpha3: 'SLV' },
  { name: 'Equatorial Guinea', alpha2: 'GQ', alpha3: 'GNQ' },
  { name: 'Eritrea', alpha2: 'ER', alpha3: 'ERI' },
  { name: 'Estonia', alpha2: 'EE', alpha3: 'EST' },
  { name: 'Ethiopia', alpha2: 'ET', alpha3: 'ETH' },
  { name: 'Falkland Islands (Malvinas)', alpha2: 'FK', alpha3: 'FLK' },
  { name: 'Faroe Islands', alpha2: 'FO', alpha3: 'FRO' },
  { name: 'Fiji', alpha2: 'FJ', alpha3: 'FJI' },
  { name: 'Finland', alpha2: 'FI', alpha3: 'FIN' },
  { name: 'France', alpha2: 'FR', alpha3: 'FRA' },
  { name: 'French Guiana', alpha2: 'GF', alpha3: 'GUF' },
  { name: 'French Polynesia', alpha2: 'PF', alpha3: 'PYF' },
  { name: 'French Southern Territories', alpha2: 'TF', alpha3: 'ATF' },
  { name: 'Gabon', alpha2: 'GA', alpha3: 'GAB' },
  { name: 'Gambia', alpha2: 'GM', alpha3: 'GMB' },
  { name: 'Georgia', alpha2: 'GE', alpha3: 'GEO' },
  { name: 'Germany', alpha2: 'DE', alpha3: 'DEU' },
  { name: 'Ghana', alpha2: 'GH', alpha3: 'GHA' },
  { name: 'Gibraltar', alpha2: 'GI', alpha3: 'GIB' },
  { name: 'Greece', alpha2: 'GR', alpha3: 'GRC' },
  { name: 'Greenland', alpha2: 'GL', alpha3: 'GRL' },
  { name: 'Grenada', alpha2: 'GD', alpha3: 'GRD' },
  { name: 'Guadeloupe', alpha2: 'GP', alpha3: 'GLP' },
  { name: 'Guam', alpha2: 'GU', alpha3: 'GUM' },
  { name: 'Guatemala', alpha2: 'GT', alpha3: 'GTM' },
  { name: 'Guernsey', alpha2: 'GG', alpha3: 'GGY' },
  { name: 'Guinea', alpha2: 'GN', alpha3: 'GIN' },
  { name: 'Guinea-Bissau', alpha2: 'GW', alpha3: 'GNB' },
  { name: 'Guyana', alpha2: 'GY', alpha3: 'GUY' },
  { name: 'Haiti', alpha2: 'HT', alpha3: 'HTI' },
  { name: 'Heard and Mcdonald Islands', alpha2: 'HM', alpha3: 'HMD' },
  { name: 'Holy See (Vatican City State)', alpha2: 'VA', alpha3: 'VAT' },
  { name: 'Honduras', alpha2: 'HN', alpha3: 'HND' },
  { name: 'Hungary', alpha2: 'HU', alpha3: 'HUN' },
  { name: 'Iceland', alpha2: 'IS', alpha3: 'ISL' },
  { name: 'India', alpha2: 'IN', alpha3: 'IND' },
  { name: 'Indonesia', alpha2: 'ID', alpha3: 'IDN' },
  { name: 'Iran, Islamic Republic of', alpha2: 'IR', alpha3: 'IRN' },
  { name: 'Iraq', alpha2: 'IQ', alpha3: 'IRQ' },
  { name: 'Ireland', alpha2: 'IE', alpha3: 'IRL' },
  { name: 'Isle of Man', alpha2: 'IM', alpha3: 'IMN' },
  { name: 'Israel', alpha2: 'IL', alpha3: 'ISR' },
  { name: 'Italy', alpha2: 'IT', alpha3: 'ITA' },
  { name: 'Jamaica', alpha2: 'JM', alpha3: 'JAM' },
  { name: 'Japan', alpha2: 'JP', alpha3: 'JPN' },
  { name: 'Jersey', alpha2: 'JE', alpha3: 'JEY' },
  { name: 'Jordan', alpha2: 'JO', alpha3: 'JOR' },
  { name: 'Kazakhstan', alpha2: 'KZ', alpha3: 'KAZ' },
  { name: 'Kenya', alpha2: 'KE', alpha3: 'KEN' },
  { name: 'Kiribati', alpha2: 'KI', alpha3: 'KIR' },
  { name: 'North Korea', alpha2: 'KP', alpha3: 'PRK' },
  { name: 'South Korea', alpha2: 'KR', alpha3: 'KOR' },
  { name: 'Kuwait', alpha2: 'KW', alpha3: 'KWT' },
  { name: 'Kyrgyzstan', alpha2: 'KG', alpha3: 'KGZ' },
  { name: 'Lao PDR', alpha2: 'LA', alpha3: 'LAO' },
  { name: 'Latvia', alpha2: 'LV', alpha3: 'LVA' },
  { name: 'Lebanon', alpha2: 'LB', alpha3: 'LBN' },
  { name: 'Lesotho', alpha2: 'LS', alpha3: 'LSO' },
  { name: 'Liberia', alpha2: 'LR', alpha3: 'LBR' },
  { name: 'Libya', alpha2: 'LY', alpha3: 'LBY' },
  { name: 'Liechtenstein', alpha2: 'LI', alpha3: 'LIE' },
  { name: 'Lithuania', alpha2: 'LT', alpha3: 'LTU' },
  { name: 'Luxembourg', alpha2: 'LU', alpha3: 'LUX' },
  { name: 'Macedonia, Republic of', alpha2: 'MK', alpha3: 'MKD' },
  { name: 'Madagascar', alpha2: 'MG', alpha3: 'MDG' },
  { name: 'Malawi', alpha2: 'MW', alpha3: 'MWI' },
  { name: 'Malaysia', alpha2: 'MY', alpha3: 'MYS' },
  { name: 'Maldives', alpha2: 'MV', alpha3: 'MDV' },
  { name: 'Mali', alpha2: 'ML', alpha3: 'MLI' },
  { name: 'Malta', alpha2: 'MT', alpha3: 'MLT' },
  { name: 'Marshall Islands', alpha2: 'MH', alpha3: 'MHL' },
  { name: 'Martinique', alpha2: 'MQ', alpha3: 'MTQ' },
  { name: 'Mauritania', alpha2: 'MR', alpha3: 'MRT' },
  { name: 'Mauritius', alpha2: 'MU', alpha3: 'MUS' },
  { name: 'Mayotte', alpha2: 'YT', alpha3: 'MYT' },
  { name: 'Mexico', alpha2: 'MX', alpha3: 'MEX' },
  { name: 'Micronesia, Federated States of', alpha2: 'FM', alpha3: 'FSM' },
  { name: 'Moldova', alpha2: 'MD', alpha3: 'MDA' },
  { name: 'Monaco', alpha2: 'MC', alpha3: 'MCO' },
  { name: 'Mongolia', alpha2: 'MN', alpha3: 'MNG' },
  { name: 'Montenegro', alpha2: 'ME', alpha3: 'MNE' },
  { name: 'Montserrat', alpha2: 'MS', alpha3: 'MSR' },
  { name: 'Morocco', alpha2: 'MA', alpha3: 'MAR' },
  { name: 'Mozambique', alpha2: 'MZ', alpha3: 'MOZ' },
  { name: 'Myanmar', alpha2: 'MM', alpha3: 'MMR' },
  { name: 'Namibia', alpha2: 'NA', alpha3: 'NAM' },
  { name: 'Nauru', alpha2: 'NR', alpha3: 'NRU' },
  { name: 'Nepal', alpha2: 'NP', alpha3: 'NPL' },
  { name: 'Netherlands', alpha2: 'NL', alpha3: 'NLD' },
  { name: 'Netherlands Antilles', alpha2: 'AN', alpha3: 'ANT' },
  { name: 'New Caledonia', alpha2: 'NC', alpha3: 'NCL' },
  { name: 'New Zealand', alpha2: 'NZ', alpha3: 'NZL' },
  { name: 'Nicaragua', alpha2: 'NI', alpha3: 'NIC' },
  { name: 'Niger', alpha2: 'NE', alpha3: 'NER' },
  { name: 'Nigeria', alpha2: 'NG', alpha3: 'NGA' },
  { name: 'Niue', alpha2: 'NU', alpha3: 'NIU' },
  { name: 'Norfolk Island', alpha2: 'NF', alpha3: 'NFK' },
  { name: 'Northern Mariana Islands', alpha2: 'MP', alpha3: 'MNP' },
  { name: 'Norway', alpha2: 'NO', alpha3: 'NOR' },
  { name: 'Oman', alpha2: 'OM', alpha3: 'OMN' },
  { name: 'Pakistan', alpha2: 'PK', alpha3: 'PAK' },
  { name: 'Palau', alpha2: 'PW', alpha3: 'PLW' },
  { name: 'Palestinian Territory', alpha2: 'PS', alpha3: 'PSE' },
  { name: 'Panama', alpha2: 'PA', alpha3: 'PAN' },
  { name: 'Papua New Guinea', alpha2: 'PG', alpha3: 'PNG' },
  { name: 'Paraguay', alpha2: 'PY', alpha3: 'PRY' },
  { name: 'Peru', alpha2: 'PE', alpha3: 'PER' },
  { name: 'Philippines', alpha2: 'PH', alpha3: 'PHL' },
  { name: 'Pitcairn', alpha2: 'PN', alpha3: 'PCN' },
  { name: 'Poland', alpha2: 'PL', alpha3: 'POL' },
  { name: 'Portugal', alpha2: 'PT', alpha3: 'PRT' },
  { name: 'Puerto Rico', alpha2: 'PR', alpha3: 'PRI' },
  { name: 'Qatar', alpha2: 'QA', alpha3: 'QAT' },
  { name: 'Réunion', alpha2: 'RE', alpha3: 'REU' },
  { name: 'Romania', alpha2: 'RO', alpha3: 'ROU' },
  { name: 'Russian Federation', alpha2: 'RU', alpha3: 'RUS' },
  { name: 'Rwanda', alpha2: 'RW', alpha3: 'RWA' },
  { name: 'Saint-Barthélemy', alpha2: 'BL', alpha3: 'BLM' },
  { name: 'Saint Helena', alpha2: 'SH', alpha3: 'SHN' },
  { name: 'Saint Kitts and Nevis', alpha2: 'KN', alpha3: 'KNA' },
  { name: 'Saint Lucia', alpha2: 'LC', alpha3: 'LCA' },
  { name: 'Saint-Martin (French part)', alpha2: 'MF', alpha3: 'MAF' },
  { name: 'Saint Pierre and Miquelon', alpha2: 'PM', alpha3: 'SPM' },
  { name: 'Saint Vincent and Grenadines', alpha2: 'VC', alpha3: 'VCT' },
  { name: 'Samoa', alpha2: 'WS', alpha3: 'WSM' },
  { name: 'San Marino', alpha2: 'SM', alpha3: 'SMR' },
  { name: 'Sao Tome and Principe', alpha2: 'ST', alpha3: 'STP' },
  { name: 'Saudi Arabia', alpha2: 'SA', alpha3: 'SAU' },
  { name: 'Senegal', alpha2: 'SN', alpha3: 'SEN' },
  { name: 'Serbia', alpha2: 'RS', alpha3: 'SRB' },
  { name: 'Seychelles', alpha2: 'SC', alpha3: 'SYC' },
  { name: 'Sierra Leone', alpha2: 'SL', alpha3: 'SLE' },
  { name: 'Singapore', alpha2: 'SG', alpha3: 'SGP' },
  { name: 'Slovakia', alpha2: 'SK', alpha3: 'SVK' },
  { name: 'Slovenia', alpha2: 'SI', alpha3: 'SVN' },
  { name: 'Solomon Islands', alpha2: 'SB', alpha3: 'SLB' },
  { name: 'Somalia', alpha2: 'SO', alpha3: 'SOM' },
  { name: 'South Africa', alpha2: 'ZA', alpha3: 'ZAF' },
  { name: 'South Georgia and the South Sandwich Islands', alpha2: 'GS', alpha3: 'SGS' },
  { name: 'South Sudan', alpha2: 'SS', alpha3: 'SSD' },
  { name: 'Spain', alpha2: 'ES', alpha3: 'ESP' },
  { name: 'Sri Lanka', alpha2: 'LK', alpha3: 'LKA' },
  { name: 'Sudan', alpha2: 'SD', alpha3: 'SDN' },
  { name: 'Suriname', alpha2: 'SR', alpha3: 'SUR' },
  { name: 'Svalbard and Jan Mayen Islands', alpha2: 'SJ', alpha3: 'SJM' },
  { name: 'Swaziland', alpha2: 'SZ', alpha3: 'SWZ' },
  { name: 'Sweden', alpha2: 'SE', alpha3: 'SWE' },
  { name: 'Switzerland', alpha2: 'CH', alpha3: 'CHE' },
  { name: 'Syrian Arab Republic (Syria)', alpha2: 'SY', alpha3: 'SYR' },
  { name: 'Taiwan, Republic of China', alpha2: 'TW', alpha3: 'TWN' },
  { name: 'Tajikistan', alpha2: 'TJ', alpha3: 'TJK' },
  { name: 'Tanzania, United Republic of', alpha2: 'TZ', alpha3: 'TZA' },
  { name: 'Thailand', alpha2: 'TH', alpha3: 'THA' },
  { name: 'Timor-Leste', alpha2: 'TL', alpha3: 'TLS' },
  { name: 'Togo', alpha2: 'TG', alpha3: 'TGO' },
  { name: 'Tokelau', alpha2: 'TK', alpha3: 'TKL' },
  { name: 'Tonga', alpha2: 'TO', alpha3: 'TON' },
  { name: 'Trinidad and Tobago', alpha2: 'TT', alpha3: 'TTO' },
  { name: 'Tunisia', alpha2: 'TN', alpha3: 'TUN' },
  { name: 'Turkey', alpha2: 'TR', alpha3: 'TUR' },
  { name: 'Turkmenistan', alpha2: 'TM', alpha3: 'TKM' },
  { name: 'Turks and Caicos Islands', alpha2: 'TC', alpha3: 'TCA' },
  { name: 'Tuvalu', alpha2: 'TV', alpha3: 'TUV' },
  { name: 'Uganda', alpha2: 'UG', alpha3: 'UGA' },
  { name: 'Ukraine', alpha2: 'UA', alpha3: 'UKR' },
  { name: 'United Arab Emirates', alpha2: 'AE', alpha3: 'ARE' },
  { name: 'United Kingdom', alpha2: 'GB', alpha3: 'GBR' },
  { name: 'United States of America', alpha2: 'US', alpha3: 'USA' },
  { name: 'US Minor Outlying Islands', alpha2: 'UM', alpha3: 'UMI' },
  { name: 'Uruguay', alpha2: 'UY', alpha3: 'URY' },
  { name: 'Uzbekistan', alpha2: 'UZ', alpha3: 'UZB' },
  { name: 'Vanuatu', alpha2: 'VU', alpha3: 'VUT' },
  { name: 'Venezuela (Bolivarian Republic)', alpha2: 'VE', alpha3: 'VEN' },
  { name: 'Viet Nam', alpha2: 'VN', alpha3: 'VNM' },
  { name: 'Virgin Islands, US', alpha2: 'VI', alpha3: 'VIR' },
  { name: 'Wallis and Futuna Islands', alpha2: 'WF', alpha3: 'WLF' },
  { name: 'Western Sahara', alpha2: 'EH', alpha3: 'ESH' },
  { name: 'Yemen', alpha2: 'YE', alpha3: 'YEM' },
  { name: 'Zambia', alpha2: 'ZM', alpha3: 'ZMB' },
  { name: 'Zimbabwe', alpha2: 'ZW', alpha3: 'ZWE' }
];

class Country extends Command {
  constructor (client) {
    super(client, {
      name: 'country',
      description: 'Get info about a country.',
      usage: 'country <country code>',
      category: 'Fun'
    });
  }

  async run (message, args) {
    let country;
    let code;

    if (args.length === 1) {
      if (args[0].length === 2) {
        country = countries.find(c => c.alpha2 === args[0].toUpperCase());
      } else if (args[0].length === 3) {
        country = countries.find(c => c.alpha3 === args[0].toUpperCase());
      }
    }

    if (!country) {
      country = countries.find(c => c.name.toLowerCase().search(args.join(' ').toLowerCase()) !== -1);
    }

    if (country) {
      code = country.alpha3.toLowerCase();
    }

    if (!code) {
      return message.channel.send(`I couldn't find a country matching ${args.join(' ')}`);
    }

    try {
      const countrycode = code;
      const res = await superagent.get('https://restcountries.eu/rest/v2/alpha/' + countrycode);

      const countryname = res.body.name;
      const countrypopulation = res.body.population;
      const countryregion = res.body.subregion;
      const countrycapital = res.body.capital;
      const countrydemonym = res.body.demonym;
      const countryareakm = res.body.area;
      const countryaream = parseInt(countryareakm * 0.62137, 10).toLocaleString('en');
      const countrynativename = res.body.nativeName;
      const countrycurrencyname = res.body.currencies[0].name;
      const countrycurrencysymbol = res.body.currencies[0].symbol;
      const countryflag = `http://www.countryflags.io/${res.body.alpha2Code}/flat/64.png`;

      const em = new EmbedBuilder()
        .setAuthor({ name: `'Country Information' -  ${countrycode}`, iconURL: countryflag })
        .setThumbnail(countryflag)
        .setColor(0x337fd5)
        .setTitle(countryname)
        .addFields([
          { name: 'Population', value: countrypopulation.toLocaleString('en'), inLine: true },
          { name: 'Capital City', value: countrycapital, inLine: true },
          { name: 'Main Currency', value: countrycurrencyname + ' (' + countrycurrencysymbol + ')', inLine: true },
          { name: 'Located In', value: countryregion, inLine: true },
          { name: 'Demonym', value: countrydemonym, inLine: true },
          { name: 'Native Name', value: countrynativename, inLine: true },
          { name: 'Area', value: `${countryareakm.toLocaleString('en')}km (${countryaream}m)`, inLine: true }
        ])
        .setFooter({ text: 'Powered by: restcountries.eu' })
        .setTimestamp();

      return message.channel.send({ embeds: [em] });
    } catch (err) {
      return message.channel.send(`Error! Unable to fetch country information. \n${err}`);
    }
  }
}

module.exports = Country;
