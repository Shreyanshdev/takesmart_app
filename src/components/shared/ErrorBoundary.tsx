import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../../theme/colors';
import { logger } from '../../utils/logger';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error("Uncaught error:", error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.subtitle}>The app crashed. Here is the error:</Text>
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{this.state.error?.toString()}</Text>
                        </View>
                        {this.state.errorInfo && (
                            <View style={styles.stackBox}>
                                <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.button}
                            onPress={() => this.setState({ hasError: false })}
                        >
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        padding: 20,
        justifyContent: 'center',
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#D32F2F',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    errorBox: {
        backgroundColor: '#FFEBEE',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#FFCDD2'
    },
    errorText: {
        color: '#B71C1C',
        fontFamily: 'monospace'
    },
    stackBox: {
        backgroundColor: '#EEEEEE',
        padding: 10,
        borderRadius: 8,
        marginBottom: 20,
        maxHeight: 200,
    },
    stackText: {
        fontSize: 10,
        color: '#666',
        fontFamily: 'monospace'
    },
    button: {
        backgroundColor: colors.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center'
    },
    buttonText: {
        color: colors.black,
        fontWeight: 'bold',
        fontSize: 16
    }
});
