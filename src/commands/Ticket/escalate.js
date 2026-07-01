import { getColor } from '../../config/bot.js';
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { handleInteractionError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getTicketPermissionContext } from '../../utils/ticketPermissions.js';

export default {
  data: new SlashCommandBuilder()
    .setName("escalate")
    .setDescription("Escalates a claimed ticket to the moderation department.")
    .setDMPermission(false),

  async execute(interaction, guildConfig, client) {
    try {
      const deferred = await InteractionHelper.safeDefer(interaction, {
        flags: MessageFlags.Ephemeral
      });
      if (!deferred) {
        return;
      }

      const permissionContext = await getTicketPermissionContext({ client, interaction });
      if (!permissionContext.ticketData) {
        return await InteractionHelper.safeEditReply(interaction, {
          content: 'This command can only be used in a valid ticket channel.'
        });
      }

      if (!permissionContext.canManageTicket) {
        return await InteractionHelper.safeEditReply(interaction, {
          content: 'You need the `Manage Channels` permission or the configured `Ticket Staff Role` to escalate tickets.'
        });
      }

      const channel = interaction.channel;
      const guild = interaction.guild;

      const supportRoleId = guildConfig?.supportRoleId || '1506631605576270004';
      const modRoleId = guildConfig?.modDepartmentRoleId || '1506843456943689798';

      const supportRole = guild.roles.cache.get(supportRoleId);
      const modRole = guild.roles.cache.get(modRoleId);

      if (!supportRole) {
        return await InteractionHelper.safeEditReply(interaction, {
          content: 'Support role not found.'
        });
      }

      if (!modRole) {
        return await InteractionHelper.safeEditReply(interaction, {
          content: 'Moderation Department role not found.'
        });
      }

      const claimOverwrite = channel.permissionOverwrites.cache.find((overwrite) => {
        if (overwrite.type !== 1) return false;
        const allow = overwrite.allow?.bitfield?.toString?.() ?? '';
        const deny = overwrite.deny?.bitfield?.toString?.() ?? '';
        return overwrite.id !== guild.id && overwrite.id !== supportRole.id && overwrite.id !== modRole.id && (allow.length > 0 || deny.length > 0);
      });

      if (claimOverwrite) {
        await claimOverwrite.delete('Ticket escalated and unclaimed');
      }

      await channel.permissionOverwrites.edit(supportRole, {
        ViewChannel: false,
        SendMessages: false,
        ReadMessageHistory: false
      }, { reason: 'Ticket escalated to moderation' });

      await channel.permissionOverwrites.edit(modRole, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      }, { reason: 'Ticket escalated to moderation' });

      const currentName = channel.name || 'ticket';
      const newName = currentName.endsWith('mod') ? currentName : `${currentName}mod`;

      if (newName !== currentName) {
        await channel.setName(newName, 'Ticket escalated to moderation department');
      }

      await channel.send({
        content: `<@&${modRole.id}>`,
        embeds: [
          successEmbed(
            'Ticket Escalated',
            'This ticket has been escalated to the moderation department.'
          )
        ]
      });

      await InteractionHelper.safeEditReply(interaction, {
        content: 'Ticket escalated successfully.'
      });

      logger.info('Ticket escalated successfully', {
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        channelId: channel.id,
        channelName: channel.name,
        guildId: interaction.guildId,
        commandName: 'escalate'
      });
    } catch (error) {
      logger.error('Error executing escalate command', {
        error: error.message,
        stack: error.stack,
        userId: interaction.user.id,
        channelId: interaction.channel?.id,
        guildId: interaction.guildId,
        commandName: 'escalate'
      });

      await handleInteractionError(interaction, error, {
        commandName: 'escalate',
        source: 'ticket_escalate_command'
      });
    }
  },
};
