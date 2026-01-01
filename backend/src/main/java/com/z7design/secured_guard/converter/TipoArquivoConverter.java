package com.z7design.secured_guard.converter;

import com.z7design.secured_guard.model.ModeloDocumento;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class TipoArquivoConverter implements AttributeConverter<ModeloDocumento.TipoArquivo, String> {
    
    @Override
    public String convertToDatabaseColumn(ModeloDocumento.TipoArquivo tipoArquivo) {
        if (tipoArquivo == null) {
            return null;
        }
        // Converter para minúsculas para corresponder à constraint do banco
        return tipoArquivo.name().toLowerCase();
    }
    
    @Override
    public ModeloDocumento.TipoArquivo convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        // Converter de minúsculas para Enum
        return ModeloDocumento.TipoArquivo.fromString(dbData);
    }
}

