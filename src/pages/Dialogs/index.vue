<script setup lang="ts">
import SelectAreaDialog from './SelectAreaDialog.vue'
import SelectPointDialog from './SelectPointDialog.vue'
import DeleteChatDialog from './DeleteChatDialog.vue'
import DeleteSessionDialog from './DeleteSessionDialog.vue'
import UserAddNode from './UserAddNode.vue'
import AIAddNode from './AIAddNode.vue'
import EditNode from './EditNode.vue'
import DeleteNode from './DeleteNode.vue'
import DeleteChildren from './DeleteChildren.vue'
import QuoteMindmap from './QuoteMindmap.vue'
import LogoutDialog from './LogoutDialog.vue'

import { useUserInfoStore } from '@/stores/user'
import type { SessionType } from '@/stores/types/session.type'

const userStore = useUserInfoStore()

defineProps<{
  selectSession: SessionType | null
}>()
</script>

<template>
  <select-area-dialog :showDialog="userStore.showDialog === 'selectArea'" />
  <select-point-dialog :showDialog="userStore.showDialog === 'selectPoint'" />
  <delete-chat-dialog :showDialog="userStore.showDialog === 'deleteChat'" />
  <delete-session-dialog :showDialog="userStore.showDialog === 'deleteSession'" :selectSession="selectSession" />
  <user-add-node :showDialog="userStore.showDialog === 'userAddNode'" />
  <AI-add-node :showDialog="userStore.showDialog === 'AIAddNode'" />
  <edit-node :showDialog="userStore.showDialog === 'editNode'" />
  <delete-node :showDialog="userStore.showDialog === 'deleteNode'" />
  <delete-children :showDialog="userStore.showDialog === 'deleteChildren'" />
  <quote-mindmap :showDialog="userStore.showDialog === 'quoteMindmap'" />
  <logout-dialog :showDialog="userStore.showDialog === 'logout'" />
</template>
