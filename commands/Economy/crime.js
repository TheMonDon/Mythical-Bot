const Command = require('../../base/Command.js');
const { EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
require('moment-duration-format');
const moment = require('moment');
const db = new QuickDB();

class Crime extends Command {
  constructor(client) {
    super(client, {
      name: 'crime',
      category: 'Economy',
      description: 'Commit a crime for a chance at some extra money',
      usage: 'crime',
      examples: ['crime'],
      guildOnly: true,
    });
  }

  async run(msg) {
    const connection = await this.client.db.getConnection();
    const type = 'crime';

    const cooldown = (await db.get(`servers.${msg.guild.id}.economy.${type}.cooldown`)) || 600;
    const [userCooldownRows] = await connection.execute(
      /* sql */ `
        SELECT
          *
        FROM
          cooldowns
        WHERE
          user_id = ?
          AND cooldown_name = 'slut'
          AND expires_at > NOW()
      `,
      [msg.author.id],
    );
    const expiresAt = userCooldownRows[0]?.expires_at;

    const embed = new EmbedBuilder()
      .setColor(msg.settings.embedErrorColor)
      .setAuthor({ name: msg.member.displayName, iconURL: msg.member.displayAvatarURL() });

    // Check if the user is on cooldown
    if (expiresAt) {
      const timeleft = new Date(expiresAt) - Date.now();
      if (timeleft > 0 && timeleft <= cooldown * 1000) {
        const timeLeft = moment
          .duration(timeleft)
          .format('y[ years][,] M[ Months][,] d[ days][,] h[ hours][,] m[ minutes][ and] s[ seconds]'); // format to any format
        embed.setDescription(`Please wait ${timeLeft} to commit a crime again.`);

        connection.release();
        return msg.channel.send({ embeds: [embed] });
      }
    }

    // Get the user's net worth
    const cash = BigInt(
      (await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`)) ||
        (await db.get(`servers.${msg.guild.id}.economy.startBalance`)) ||
        0,
    );
    const bank = BigInt((await db.get(`servers.${msg.guild.id}.users.${msg.member.id}.economy.bank`)) || 0);
    const authNet = cash + bank;

    // Get the min and max amounts of money the user can get
    const min = Number(await db.get(`servers.${msg.guild.id}.economy.${type}.min`)) || 250;
    const max = Number(await db.get(`servers.${msg.guild.id}.economy.${type}.max`)) || 700;

    // Get the min and max fine percentages
    const minFine = Number(await db.get(`servers.${msg.guild.id}.economy.${type}.fine.min`)) || 20;
    const maxFine = Number(await db.get(`servers.${msg.guild.id}.economy.${type}.fine.max`)) || 40;

    // randomFine is a random number between the minimum and maximum fail rate
    const randomFine = BigInt(Math.abs(Math.round(Math.random() * (maxFine - minFine + 1) + minFine)));

    // fineAmount is the amount of money the user will lose if they fail the action
    const fineAmount = this.client.util.bigIntAbs((authNet / BigInt(100)) * randomFine);

    const failRate = (await db.get(`servers.${msg.guild.id}.economy.${type}.failrate`)) || 45;
    const ranNum = Math.random() * 100;

    const currencySymbol = (await db.get(`servers.${msg.guild.id}.economy.symbol`)) || '$';

    delete require.cache[require.resolve('../../resources/messages/crime_success.json')];
    delete require.cache[require.resolve('../../resources/messages/crime_fail.json')];
    const crimeSuccess = require('../../resources/messages/crime_success.json');
    const crimeFail = require('../../resources/messages/crime_fail.json');

    if (ranNum < failRate) {
      const csamount = currencySymbol + fineAmount.toLocaleString();
      const num = Math.floor(Math.random() * (crimeFail.length - 1)) + 1;

      embed
        .setColor(msg.settings.embedErrorColor)
        .setDescription(crimeFail[num].replace('{amount}', csamount))
        .setFooter({ text: `Reply #${num.toLocaleString()}` });

      await msg.channel.send({ embeds: [embed] });

      const newAmount = cash - fineAmount;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());
    } else {
      const amount = BigInt(Math.abs(Math.floor(Math.random() * (max - min + 1) + min)));
      const csamount = currencySymbol + amount.toLocaleString();
      const num = Math.floor(Math.random() * (crimeSuccess.length - 1)) + 1;

      embed
        .setColor(msg.settings.embedSuccessColor)
        .setDescription(crimeSuccess[num].replace('{amount}', csamount))
        .setFooter({ text: `Reply #${num.toLocaleString()}` });

      await msg.channel.send({ embeds: [embed] });

      const newAmount = cash + amount;
      await db.set(`servers.${msg.guild.id}.users.${msg.member.id}.economy.cash`, newAmount.toString());
    }

    await connection.execute(
      /* sql */ `
        INSERT INTO
          cooldowns (guild_id, user_id, cooldown_name, expires_at)
        VALUES
          (?, ?, ?, NOW() + INTERVAL ? SECOND) ON DUPLICATE KEY
        UPDATE expires_at =
        VALUES
          (expires_at)
      `,
      [msg.guild.id, msg.author.id, 'crime', cooldown],
    );

    connection.release();
  }
}

module.exports = Crime;
