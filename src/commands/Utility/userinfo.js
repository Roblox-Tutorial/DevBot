import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Get detailed information about a user")
    .addUserOption(option =>
      option
        .setName("target")
        .setDescription("The user to inspect (defaults to you)")
    ),

  async execute(interaction) {
    try {
      const deferSuccess = await InteractionHelper.safeDefer(interaction);

      if (!deferSuccess) {
        logger.warn("UserInfo interaction defer failed", {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          commandName: "userinfo"
        });
        return;
      }

      const user = interaction.options.getUser("target") || interaction.user;

      // Fetch member to ensure roles are up to date
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      const createdTimestamp = Math.floor(user.createdAt.getTime() / 1000);
      const joinedTimestamp = member?.joinedAt
        ? Math.floor(member.joinedAt.getTime() / 1000)
        : null;

      // Company rank roles only
      const isCompanyRank = (roleName) => {
        return (
          /^\d+\s*\|/.test(roleName) ||     // e.g. 255 | Chairman
          roleName.startsWith("HO |") ||
          roleName.startsWith("🌸") ||// HO | Head Office
          roleName.startsWith("BOA |")      // BOA | Board Of Directors
        );
      };

      // Highest company rank
      const highestCompanyRole = member?.roles.cache
        .filter(role => role.name !== "@everyone")
        .filter(role => isCompanyRank(role.name))
        .sort((a, b) => b.position - a.position)
        .first();

      // All roles (mentioned), highest → lowest
      const roles =
        member?.roles.cache
          .filter(role => role.name !== "@everyone")
          .sort((a, b) => b.position - a.position)
          .map(role => role.toString())
          .join(", ") || "None";

      const embed = createEmbed({
        title: `User Info: ${user.username}`
      })
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          {
            name: "ID",
            value: `\`${user.id}\``,
            inline: true
          },
          {
            name: "Bot",
            value: user.bot ? "Yes" : "No",
            inline: true
          },
          {
            name: "Highest Role",
            value: highestCompanyRole
              ? highestCompanyRole.toString()
              : "None",
            inline: true
          },
          {
            name: "Account Created",
            value: `<t:${createdTimestamp}:F>\n(<t:${createdTimestamp}:R>)`,
            inline: false
          },
          {
            name: "Joined Server",
            value: joinedTimestamp
              ? `<t:${joinedTimestamp}:F>\n(<t:${joinedTimestamp}:R>)`
              : "Not in this server",
            inline: false
          },
          {
            name: "Roles",
            value: roles,
            inline: false
          }
        );

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [embed]
      });

      logger.info("UserInfo command executed", {
        userId: interaction.user.id,
        targetUserId: user.id,
        guildId: interaction.guildId
      });

    } catch (error) {
      logger.error("UserInfo command execution failed", {
        error: error.message,
        stack: error.stack,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: "userinfo"
      });

      await handleInteractionError(interaction, error, {
        commandName: "userinfo",
        source: "userinfo_command"
      });
    }
  },
};
