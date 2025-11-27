import React, { useState, useEffect } from 'react'
import { View, TextInput, Alert, StyleSheet, Button, Text, Linking } from 'react-native'
import { supabase } from '../lib/supabase'
import { useNavigation, useRoute } from '@react-navigation/native'

export default function ResetPasswordScreen() {
const navigation = useNavigation<any>()
const route = useRoute<any>()

const [password, setPassword] = useState('')
const [loading, setLoading] = useState(false)
const [accessToken, setAccessToken] = useState<string | null>(null)
const [refreshToken, setRefreshToken] = useState<string | null>(null)
const [ready, setReady] = useState(false)

const parseTokensFromUrl = (url: string | null) => {
if (!url) return { accessToken: null, refreshToken: null }


try {
  const params = new URL(url).searchParams
  let access = params.get('access_token')
  let refresh = params.get('refresh_token')

  if ((!access || !refresh) && url.includes('#')) {
    const hash = url.split('#')[1]
    const hashParams = new URLSearchParams(hash)
    access = access || hashParams.get('access_token')
    refresh = refresh || hashParams.get('refresh_token')
  }

  return { accessToken: access, refreshToken: refresh }
} catch {
  return { accessToken: null, refreshToken: null }
}


}

useEffect(() => {
const handleUrl = (url: string | null) => {
const { accessToken, refreshToken } = parseTokensFromUrl(url)
if (accessToken && refreshToken) {
setAccessToken(accessToken)
setRefreshToken(refreshToken)
setReady(true)
}
}


const paramUrl = route.params?.url
if (paramUrl) {
  handleUrl(paramUrl)
  return
}

Linking.getInitialURL().then(url => handleUrl(url))
const sub = Linking.addEventListener('url', e => handleUrl(e.url))
return () => sub.remove()


}, [route.params])

const updatePassword = async () => {
if (!password) {
Alert.alert('Error', 'Enter a new password')
return
}


if (!accessToken || !refreshToken) {
  Alert.alert('Error', 'Missing access or refresh token')
  return
}

setLoading(true)

// Set session
const { error: sessionError } = await supabase.auth.setSession({
  access_token: accessToken,
  refresh_token: refreshToken,
})
if (sessionError) {
  setLoading(false)
  Alert.alert('Error', sessionError.message)
  return
}

const { error: updateError } = await supabase.auth.updateUser({ password })
setLoading(false)

if (updateError) {
  Alert.alert('Error', updateError.message)
  return
}

// 🔥 Directly go to Home (no alert)
navigation.reset({
  index: 0,
  routes: [{ name: 'Home' }],
})


}

if (!ready) {
return ( <View style={styles.container}> <Text style={styles.waitingText}>Waiting for password reset link...</Text> </View>
)
}

return ( <View style={styles.container}> <TextInput
     style={styles.input}
     placeholder="New Password"
     secureTextEntry
     value={password}
     onChangeText={setPassword}
   />
<Button
title={loading ? 'Updating...' : 'Update Password'}
onPress={updatePassword}
disabled={loading}
/> </View>
)
}

const styles = StyleSheet.create({
container: { flex: 1, justifyContent: 'center', padding: 20 },
input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 6 },
waitingText: { textAlign: 'center', fontSize: 16, color: '#555' },
})
